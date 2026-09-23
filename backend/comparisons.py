"""Bounded, attributed human/animal comparisons from Ensembl's release 112 API.

The archive is deliberate: its representative sequences and orthology calls stay
consistent across comparisons. A live retrieval does not imply a current release.
"""

import asyncio
from collections import OrderedDict
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from math import isfinite
import re
from time import monotonic
from typing import Any

import httpx

from backend.network import ALLOWED_PROTEINS

ENSEMBL_BASE = "https://may2024.rest.ensembl.org"
CACHE_TTL_SECONDS = 24 * 60 * 60
FAILURE_TTL_SECONDS = 60
REQUEST_TIMEOUT_SECONDS = 10
WORK_TIMEOUT_SECONDS = 25
MAX_RESPONSE_BYTES = 2_000_000
MAX_RECORDS = 100
MAX_ORTHOLOGUES = 32
MAX_ALIGNMENT_LENGTH = 20_000

# Verified with release 112 POST /lookup/symbol/homo_sapiens. This also prevents
# an unexpected symbol mapping from silently comparing a different human gene.
HUMAN_GENE_IDS = {
    "TP53": "ENSG00000141510", "CDK2": "ENSG00000123374",
    "BRCA1": "ENSG00000012048", "BRCA2": "ENSG00000139618",
    "MDM2": "ENSG00000135679", "ATM": "ENSG00000149311",
    "CHEK2": "ENSG00000183765", "RAD51": "ENSG00000051180",
    "PALB2": "ENSG00000083093", "EGFR": "ENSG00000146648",
    "AKT1": "ENSG00000142208", "MTOR": "ENSG00000198793",
}


@dataclass(frozen=True)
class AnimalSpecies:
    species: str
    taxon_id: int
    label: str
    gene_pattern: str
    protein_pattern: str


SPECIES = (
    AnimalSpecies("pan_troglodytes", 9598, "Chimpanzee", r"ENSPTRG\d{11}", r"ENSPTRP\d{11}"),
    AnimalSpecies("mus_musculus", 10090, "Mouse", r"ENSMUSG\d{11}", r"ENSMUSP\d{11}"),
    AnimalSpecies("danio_rerio", 7955, "Zebrafish", r"ENSDARG\d{11}", r"ENSDARP\d{11}"),
    AnimalSpecies("drosophila_melanogaster", 7227, "Fruit fly", r"FBgn\d{7}", r"FBpp\d{7}"),
)
ORTHOLOGY_TYPES = frozenset({"ortholog_one2one", "ortholog_one2many", "ortholog_many2many"})
AMINO_ACIDS = frozenset("ACDEFGHIKLMNPQRSTVWYUBZOX")
UNAMBIGUOUS_AMINO_ACIDS = AMINO_ACIDS - {"B", "Z", "X"}


class ComparisonError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass
class CacheEntry:
    expires: float
    result: dict[str, Any] | None = None
    error: tuple[int, str] | None = None


@dataclass
class SpeciesResult:
    result: dict[str, Any]
    # Keeping the sequence here checks that all ranked rows share one reference;
    # it is never sent to the AI or browser in the comparison response.
    reference: tuple[str, str, str] | None = None
    error_status: int | None = None


comparison_cache: OrderedDict[str, CacheEntry] = OrderedDict()
comparison_lock = asyncio.Lock()


def normalize_protein(protein: str) -> str:
    if not isinstance(protein, str) or len(protein) > 40:
        raise ComparisonError(422, "Choose a human protein from the playground catalog.")
    selected = protein.strip().upper()
    if selected not in ALLOWED_PROTEINS or selected not in HUMAN_GENE_IDS:
        raise ComparisonError(422, "Choose a human protein from the playground catalog.")
    return selected


def _species_result(species: AnimalSpecies, status: str) -> dict[str, Any]:
    return {"species": species.species, "taxonId": species.taxon_id,
            "label": species.label, "status": status, "orthologues": []}


def _identifier(value: Any, pattern: str) -> str:
    if not isinstance(value, str) or len(value) > 80 or not re.fullmatch(pattern, value, re.ASCII):
        raise ValueError("Ensembl returned an invalid gene or protein identifier.")
    return value


def _percentage(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 100 or not isfinite(value):
        raise ValueError("Ensembl returned an invalid identity percentage.")
    return float(value)


def _alignment(value: Any) -> str:
    if not isinstance(value, str) or not 1 <= len(value) <= MAX_ALIGNMENT_LENGTH:
        raise ValueError("Ensembl returned an invalid protein alignment.")
    if any(character not in AMINO_ACIDS and character != "-" for character in value):
        raise ValueError("Ensembl returned an invalid amino acid sequence.")
    if not value.replace("-", ""):
        raise ValueError("Ensembl returned an empty protein sequence.")
    return value


def parse_homologies(protein: str, species: AnimalSpecies, payload: Any) -> SpeciesResult:
    """Validate one symbol/species response; an empty verified list is not 0%."""
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise ValueError("Ensembl returned an invalid response.")
    records = payload["data"]
    if len(records) > MAX_RECORDS or len(records) != 1 or not isinstance(records[0], dict):
        raise ValueError("Ensembl did not resolve the selected human gene unambiguously.")
    record = records[0]
    if record.get("id") != HUMAN_GENE_IDS[protein]:
        raise ValueError("Ensembl returned a different human gene.")
    homologies = record.get("homologies")
    if not isinstance(homologies, list) or len(homologies) > MAX_ORTHOLOGUES:
        raise ValueError("Ensembl returned too many or invalid orthologues.")
    result = _species_result(species, "matched" if homologies else "not_found")
    reference = None
    identities = set()
    for homology in homologies:
        if (not isinstance(homology, dict) or not isinstance(homology.get("type"), str)
                or homology["type"] not in ORTHOLOGY_TYPES):
            raise ValueError("Ensembl returned an unsupported homology type.")
        if homology.get("method_link_type") != "ENSEMBL_ORTHOLOGUES":
            raise ValueError("Ensembl did not return an orthology comparison.")
        human, animal = homology.get("source"), homology.get("target")
        if not isinstance(human, dict) or not isinstance(animal, dict):
            raise ValueError("Ensembl returned an incomplete orthologue.")
        if (human.get("species") != "homo_sapiens" or type(human.get("taxon_id")) is not int
                or human["taxon_id"] != 9606 or human.get("id") != record["id"]
                or animal.get("species") != species.species or type(animal.get("taxon_id")) is not int
                or animal["taxon_id"] != species.taxon_id):
            raise ValueError("Ensembl returned a different gene or species.")
        human_id = _identifier(human.get("protein_id"), r"ENSP\d{11}")
        animal_gene = _identifier(animal.get("id"), species.gene_pattern)
        animal_protein = _identifier(animal.get("protein_id"), species.protein_pattern)
        identity_key = (animal_gene, animal_protein)
        if identity_key in identities:
            raise ValueError("Ensembl returned a duplicate orthologue.")
        identities.add(identity_key)
        source_alignment = _alignment(human.get("align_seq"))
        target_alignment = _alignment(animal.get("align_seq"))
        if len(source_alignment) != len(target_alignment):
            raise ValueError("Ensembl returned mismatched alignment lengths.")
        source_sequence = source_alignment.replace("-", "")
        target_sequence = target_alignment.replace("-", "")
        current_reference = (record["id"], human_id, source_sequence)
        if reference is not None and reference != current_reference:
            raise ValueError("Ensembl returned different human reference proteins.")
        reference = current_reference
        identical = sum(left == right and left in UNAMBIGUOUS_AMINO_ACIDS
                        for left, right in zip(source_alignment, target_alignment))
        paired = sum(left != "-" and right != "-"
                     for left, right in zip(source_alignment, target_alignment))
        human_identity = _percentage(human.get("perc_id"))
        animal_identity = _percentage(animal.get("perc_id"))
        # Ensembl reports rounded percentages. The two denominators are the
        # respective ungapped sequence lengths, not the alignment column count.
        if (abs(human_identity - 100 * identical / len(source_sequence)) > 0.001
                or abs(animal_identity - 100 * identical / len(target_sequence)) > 0.001):
            raise ValueError("Ensembl identity percentages disagree with the protein alignment.")
        result["orthologues"].append({
            "geneId": animal_gene, "proteinId": animal_protein, "type": homology["type"],
            "humanIdentity": human_identity, "animalIdentity": animal_identity,
            "humanCoverage": round(100 * paired / len(source_sequence), 4),
            "humanLength": len(source_sequence), "animalLength": len(target_sequence),
            "sourceUrl": (f"{ENSEMBL_BASE}/homology/symbol/human/{protein}"
                          f"?target_species={species.species}&type=orthologues"
                          "&sequence=protein&content-type=application/json"),
        })
    result["orthologues"].sort(key=lambda row: (-row["humanIdentity"], row["geneId"], row["proteinId"]))
    return SpeciesResult(result, reference)


async def _fetch_species(client: httpx.AsyncClient, protein: str,
                         species: AnimalSpecies) -> SpeciesResult:
    try:
        # This deadline also bounds servers that trickle a response indefinitely.
        async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
            async with client.stream("GET", f"{ENSEMBL_BASE}/homology/symbol/human/{protein}",
                                     params={"target_species": species.species, "type": "orthologues",
                                             "sequence": "protein", "aligned": 1},
                                     headers={"Content-Type": "application/json", "Accept": "application/json"}) as response:
                response.raise_for_status()
                length = response.headers.get("Content-Length")
                if length and (not length.isdigit() or int(length) > MAX_RESPONSE_BYTES):
                    raise ValueError("Ensembl response exceeds the size limit.")
                content = bytearray()
                async for chunk in response.aiter_bytes(chunk_size=65_536):
                    if len(content) + len(chunk) > MAX_RESPONSE_BYTES:
                        raise ValueError("Ensembl response exceeds the size limit.")
                    content.extend(chunk)
            payload = json.loads(content)
        return parse_homologies(protein, species, payload)
    except (httpx.TimeoutException, TimeoutError):
        return SpeciesResult(_species_result(species, "unavailable"), error_status=504)
    except (httpx.HTTPError, ValueError):
        return SpeciesResult(_species_result(species, "unavailable"), error_status=502)


async def _load_comparison(protein: str) -> dict[str, Any]:
    # The outer shared lock admits one four-species batch at a time. There can
    # therefore be at most four requests to Ensembl across all visitors.
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=False,
                                 limits=httpx.Limits(max_connections=4)) as client:
        rows = await asyncio.gather(*(_fetch_species(client, protein, species) for species in SPECIES))
    if all(row.result["status"] == "unavailable" for row in rows):
        status = 504 if all(row.error_status == 504 for row in rows) else 502
        raise ComparisonError(status, "Ensembl comparisons could not be retrieved or validated. Please retry.")
    references = {row.reference for row in rows if row.reference is not None}
    if len(references) > 1:
        raise ComparisonError(502, "Ensembl returned inconsistent human reference proteins. Please retry.")
    reference = next(iter(references), None)
    return {
        "human": {"symbol": protein, "geneId": reference[0] if reference else None,
                  "proteinId": reference[1] if reference else None},
        "metric": "human_sequence_identity",
        "species": [row.result for row in rows],
        "source": {"name": "Ensembl 112 · May 2024", "release": 112, "url": f"{ENSEMBL_BASE}/",
                   "retrievedAt": datetime.now(timezone.utc).isoformat(), "cached": False},
    }


def _store(protein: str, entry: CacheEntry) -> None:
    comparison_cache[protein] = entry
    comparison_cache.move_to_end(protein)
    while len(comparison_cache) > len(HUMAN_GENE_IDS):
        comparison_cache.popitem(last=False)


async def retrieve_comparison(protein: str) -> dict[str, Any]:
    """Return a validated comparison; expose only bounded, safe public errors."""
    selected = normalize_protein(protein)
    try:
        # Includes the time spent waiting behind another visitor's comparison.
        async with asyncio.timeout(WORK_TIMEOUT_SECONDS):
            async with comparison_lock:
                existing = comparison_cache.get(selected)
                if existing and monotonic() < existing.expires:
                    comparison_cache.move_to_end(selected)
                    if existing.error:
                        raise ComparisonError(*existing.error)
                    result = deepcopy(existing.result)
                    result["source"]["cached"] = True
                    return result
                try:
                    result = await _load_comparison(selected)
                except ComparisonError as error:
                    _store(selected, CacheEntry(monotonic() + FAILURE_TTL_SECONDS,
                                               error=(error.status_code, error.detail)))
                    raise
                ttl = FAILURE_TTL_SECONDS if any(row["status"] == "unavailable" for row in result["species"]) else CACHE_TTL_SECONDS
                _store(selected, CacheEntry(monotonic() + ttl, result=result))
                return deepcopy(result)
    except TimeoutError as error:
        raise ComparisonError(504, "The comparison took too long. Please retry.") from error
