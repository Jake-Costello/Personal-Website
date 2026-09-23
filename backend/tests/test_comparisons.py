"""Comparison contract tests with synthetic alignments and mocked HTTP only."""

import asyncio
from collections import OrderedDict
from copy import deepcopy
import json
import unittest
from unittest.mock import patch

import httpx

from backend import comparisons
from backend.comparisons import (
    ComparisonError, HUMAN_GENE_IDS, SPECIES, parse_homologies, retrieve_comparison,
)

REAL_ASYNC_CLIENT = httpx.AsyncClient
TARGET_IDS = {
    "pan_troglodytes": ("ENSPTRG00000008703", "ENSPTRP00000014836"),
    "mus_musculus": ("ENSMUSG00000059552", "ENSMUSP00000104298"),
    "danio_rerio": ("ENSDARG00000035559", "ENSDARP00000116736"),
    "drosophila_melanogaster": ("FBgn0039044", "FBpp0083753"),
}


def response_payload(protein="TP53", species=SPECIES[0], source="ACD-E", target="AC-TE"):
    """Four residues on each side, three identities, 75% human coverage."""
    identical = sum(a == b and a in comparisons.UNAMBIGUOUS_AMINO_ACIDS for a, b in zip(source, target))
    gene, peptide = TARGET_IDS[species.species]
    return {"data": [{"id": HUMAN_GENE_IDS[protein], "homologies": [{
        "type": "ortholog_one2one", "method_link_type": "ENSEMBL_ORTHOLOGUES",
        "source": {"id": HUMAN_GENE_IDS[protein], "protein_id": "ENSP00000269305",
                   "species": "homo_sapiens", "taxon_id": 9606, "align_seq": source,
                   "perc_id": round(100 * identical / len(source.replace("-", "")), 4)},
        "target": {"id": gene, "protein_id": peptide, "species": species.species,
                   "taxon_id": species.taxon_id, "align_seq": target,
                   "perc_id": round(100 * identical / len(target.replace("-", "")), 4)},
    }]}]}


class ComparisonParsingTests(unittest.TestCase):
    def test_identity_uses_each_ungapped_sequence_and_coverage_is_distinct(self):
        payload = response_payload(source="ACD-E", target="ACDTE")
        parsed = parse_homologies("TP53", SPECIES[0], payload)
        row = parsed.result["orthologues"][0]
        self.assertEqual(row["humanIdentity"], 100)
        self.assertEqual(row["animalIdentity"], 80)
        self.assertEqual(row["humanCoverage"], 100)
        self.assertEqual((row["humanLength"], row["animalLength"]), (4, 5))
        self.assertEqual(parsed.reference, (HUMAN_GENE_IDS["TP53"], "ENSP00000269305", "ACDE"))
        payload = response_payload(source="ACD-E", target="AC-TE")
        row = parse_homologies("TP53", SPECIES[0], payload).result["orthologues"][0]
        self.assertEqual(row["humanCoverage"], 75)

    def test_ambiguous_amino_acids_cannot_inflate_identity(self):
        payload = response_payload(source="ACX-E", target="ACXTE")
        row = parse_homologies("TP53", SPECIES[0], payload).result["orthologues"][0]
        self.assertEqual((row["humanIdentity"], row["animalIdentity"]), (75, 60))
        self.assertEqual(row["humanCoverage"], 100)
        payload["data"][0]["homologies"][0]["source"]["perc_id"] = 100
        with self.assertRaises(ValueError):
            parse_homologies("TP53", SPECIES[0], payload)

    def test_one_to_many_keeps_candidates_and_orders_by_human_identity(self):
        payload = response_payload()
        first = payload["data"][0]["homologies"][0]
        first["type"] = "ortholog_one2many"
        second = deepcopy(first)
        second["target"].update({"id": "ENSPTRG00000008704", "protein_id": "ENSPTRP00000014837",
                                 "align_seq": "ACD-E", "perc_id": 100})
        second["source"]["perc_id"] = 100
        payload["data"][0]["homologies"].append(second)
        rows = parse_homologies("TP53", SPECIES[0], payload).result["orthologues"]
        self.assertEqual([row["humanIdentity"] for row in rows], [100, 75])
        self.assertTrue(all(row["type"] == "ortholog_one2many" for row in rows))
        self.assertIn("may2024.rest.ensembl.org/homology/symbol/human/TP53", rows[0]["sourceUrl"])
        payload["data"][0]["homologies"].append(deepcopy(first))
        with self.assertRaises(ValueError):
            parse_homologies("TP53", SPECIES[0], payload)

    def test_empty_orthologue_list_is_verified_missing_not_zero_identity(self):
        result = parse_homologies("TP53", SPECIES[0], {"data": [{"id": HUMAN_GENE_IDS["TP53"], "homologies": []}]})
        self.assertEqual(result.result["status"], "not_found")
        self.assertEqual(result.result["orthologues"], [])
        self.assertIsNone(result.reference)
        for invalid in ({"data": []}, {"data": [{"id": "OTHER", "homologies": []}]}, {}):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                parse_homologies("TP53", SPECIES[0], invalid)

    def test_wrong_species_ids_and_invalid_alignment_metrics_are_rejected(self):
        changes = [
            ("source", "id", HUMAN_GENE_IDS["BRCA1"]),
            ("source", "species", "mus_musculus"), ("source", "taxon_id", "9606"),
            ("source", "protein_id", "ENSMUSP00000104298"),
            ("source", "align_seq", "ACDE!"), ("source", "align_seq", "-----"),
            ("target", "align_seq", "ACD"), ("target", "align_seq", "A" * 20_001),
            ("target", "taxon_id", 10090), ("target", "species", "mus_musculus"),
            ("target", "id", "javascript:alert(1)"), ("target", "protein_id", "FBpp0083753"),
            ("source", "perc_id", float("nan")), ("source", "perc_id", float("inf")),
            ("source", "perc_id", True), ("source", "perc_id", 10 ** 1000),
            ("source", "perc_id", 76), ("target", "perc_id", 76),
        ]
        for side, key, value in changes:
            payload = response_payload()
            payload["data"][0]["homologies"][0][side][key] = value
            with self.subTest(side=side, key=key, value=str(value)[:30]), self.assertRaises(ValueError):
                parse_homologies("TP53", SPECIES[0], payload)

    def test_paralogues_oversized_arrays_and_mixed_human_references_fail(self):
        payloads = []
        wrong_type = response_payload()
        wrong_type["data"][0]["homologies"][0]["type"] = "within_species_paralog"
        payloads.append(wrong_type)
        wrong_type_shape = response_payload()
        wrong_type_shape["data"][0]["homologies"][0]["type"] = []
        payloads.append(wrong_type_shape)
        too_many_records = response_payload()
        too_many_records["data"] *= 101
        payloads.append(too_many_records)
        too_many_candidates = response_payload()
        too_many_candidates["data"][0]["homologies"] *= 33
        payloads.append(too_many_candidates)
        mixed = response_payload()
        second = deepcopy(mixed["data"][0]["homologies"][0])
        second["target"].update({"id": "ENSPTRG00000008704", "protein_id": "ENSPTRP00000014837"})
        second["source"]["protein_id"] = "ENSP00000000001"
        mixed["data"][0]["homologies"].append(second)
        payloads.append(mixed)
        for payload in payloads:
            with self.subTest(payload=str(payload)[:120]), self.assertRaises(ValueError):
                parse_homologies("TP53", SPECIES[0], payload)


class ComparisonRetrievalTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.calls = []
        self.now = 100.0
        self.active = 0
        self.peak_active = 0
        self.handler = self.success
        for target, replacement in (
            ("comparison_cache", OrderedDict()), ("comparison_lock", asyncio.Lock()),
            ("monotonic", lambda: self.now),
        ):
            patcher = patch.object(comparisons, target, replacement)
            patcher.start()
            self.addCleanup(patcher.stop)

        async def dispatch(request):
            self.calls.append(request)
            self.active += 1
            self.peak_active = max(self.peak_active, self.active)
            try:
                await asyncio.sleep(0)
                return await self.handler(request)
            finally:
                self.active -= 1

        transport = httpx.MockTransport(dispatch)
        patcher = patch.object(comparisons.httpx, "AsyncClient",
                               side_effect=lambda **kwargs: REAL_ASYNC_CLIENT(transport=transport, **kwargs))
        patcher.start()
        self.addCleanup(patcher.stop)

    async def success(self, request):
        species = next(species for species in SPECIES if species.species == request.url.params["target_species"])
        protein = request.url.path.rsplit("/", 1)[-1]
        return httpx.Response(200, json=response_payload(protein, species))

    async def test_invalid_symbols_never_contact_ensembl(self):
        for protein in ("", "UNKNOWN", "TP53,CDK2", None, "A" * 41):
            with self.subTest(protein=protein), self.assertRaises(ComparisonError) as raised:
                await retrieve_comparison(protein)
            self.assertEqual(raised.exception.status_code, 422)
        self.assertEqual(self.calls, [])

    async def test_concurrent_visitors_coalesce_and_cached_result_cannot_be_mutated(self):
        results = await asyncio.gather(*(retrieve_comparison(" tp53 ") for _ in range(8)))
        self.assertEqual(len(self.calls), 4)
        self.assertEqual(self.peak_active, 4)
        self.assertEqual(sum(not result["source"]["cached"] for result in results), 1)
        self.assertEqual({result["source"]["retrievedAt"] for result in results}, {results[0]["source"]["retrievedAt"]})
        self.assertEqual(results[0]["source"]["release"], 112)
        self.assertTrue(all(request.url.host == "may2024.rest.ensembl.org" for request in self.calls))
        results[0]["species"][0]["orthologues"][0]["humanIdentity"] = -1
        again = await retrieve_comparison("TP53")
        self.assertEqual(again["species"][0]["orthologues"][0]["humanIdentity"], 75)
        self.assertEqual(len(self.calls), 4)

    async def test_distinct_proteins_are_bounded_to_four_upstream_calls(self):
        await asyncio.gather(*(retrieve_comparison(protein) for protein in HUMAN_GENE_IDS))
        self.assertEqual(len(self.calls), 48)
        self.assertLessEqual(self.peak_active, 4)
        self.assertEqual(len(comparisons.comparison_cache), 12)
        self.now += comparisons.CACHE_TTL_SECONDS - 1
        self.assertTrue((await retrieve_comparison("TP53"))["source"]["cached"])
        self.now += 2
        self.assertFalse((await retrieve_comparison("TP53"))["source"]["cached"])
        self.assertEqual(len(self.calls), 52)

    async def test_verified_missing_results_keep_null_reference_and_no_candidates(self):
        async def missing(request):
            return httpx.Response(200, json={"data": [{"id": HUMAN_GENE_IDS["TP53"], "homologies": []}]})
        self.handler = missing
        result = await retrieve_comparison("TP53")
        self.assertEqual(result["human"], {"symbol": "TP53", "geneId": None, "proteinId": None})
        self.assertTrue(all(row["status"] == "not_found" and not row["orthologues"] for row in result["species"]))

    async def test_partial_failure_is_not_missing_and_retries_after_short_cache(self):
        async def partial(request):
            if request.url.params["target_species"] == "mus_musculus":
                raise httpx.ReadTimeout("mock upstream timeout", request=request)
            return await self.success(request)
        self.handler = partial
        result = await retrieve_comparison("TP53")
        self.assertEqual([row["status"] for row in result["species"]], ["matched", "unavailable", "matched", "matched"])
        self.assertEqual(result["human"]["proteinId"], "ENSP00000269305")
        self.handler = self.success
        self.now += 59
        self.assertTrue((await retrieve_comparison("TP53"))["source"]["cached"])
        self.now += 2
        refreshed = await retrieve_comparison("TP53")
        self.assertFalse(refreshed["source"]["cached"])
        self.assertTrue(all(row["status"] == "matched" for row in refreshed["species"]))
        self.assertEqual(len(self.calls), 8)

    async def test_all_timeouts_raise_504_coalesce_failure_and_eventually_retry(self):
        async def timeout(request):
            raise httpx.ReadTimeout("mock upstream timeout", request=request)
        self.handler = timeout
        for _ in range(2):
            with self.assertRaises(ComparisonError) as raised:
                await retrieve_comparison("TP53")
            self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(len(self.calls), 4)
        self.now += 61
        self.handler = self.success
        self.assertFalse((await retrieve_comparison("TP53"))["source"]["cached"])
        self.assertEqual(len(self.calls), 8)

    async def test_invalid_upstream_responses_raise_502_instead_of_empty_live_data(self):
        for response in (httpx.Response(503, text="Service unavailable"),
                         httpx.Response(200, text="not json"),
                         httpx.Response(200, json={"data": []}),
                         httpx.Response(200, content=b"x" * 2_000_001),
                         httpx.Response(200, content=b"{}", headers={"Content-Length": "2000001"})):
            async def invalid(request):
                return deepcopy(response)
            self.handler = invalid
            comparisons.comparison_cache.clear()
            with self.subTest(status=response.status_code, length=len(response.content)), self.assertRaises(ComparisonError) as raised:
                await retrieve_comparison("TP53")
            self.assertEqual(raised.exception.status_code, 502)

    async def test_discrepant_human_reference_id_or_sequence_rejects_entire_ranking(self):
        for mismatch in ("id", "sequence"):
            async def inconsistent(request):
                species = next(species for species in SPECIES if species.species == request.url.params["target_species"])
                payload = response_payload(species=species)
                if species.species == "mus_musculus":
                    row = payload["data"][0]["homologies"][0]
                    if mismatch == "id":
                        row["source"]["protein_id"] = "ENSP00000000001"
                    else:
                        row["source"]["align_seq"] = "ACF-E"
                return httpx.Response(200, json=payload)
            self.handler = inconsistent
            comparisons.comparison_cache.clear()
            with self.subTest(mismatch=mismatch), self.assertRaises(ComparisonError) as raised:
                await retrieve_comparison("TP53")
            self.assertEqual(raised.exception.status_code, 502)
            self.assertIn("inconsistent human reference", raised.exception.detail)

    async def test_stream_size_is_bounded_without_content_length(self):
        class OversizedStream(httpx.AsyncByteStream):
            async def __aiter__(self):
                for _ in range(32):
                    yield b"x" * 65_536

        async def oversized(request):
            return httpx.Response(200, stream=OversizedStream())
        self.handler = oversized
        with self.assertRaises(ComparisonError) as raised:
            await retrieve_comparison("TP53")
        self.assertEqual(raised.exception.status_code, 502)

    async def test_queue_deadline_and_per_request_deadline_are_bounded(self):
        async with comparisons.comparison_lock:
            with patch.object(comparisons, "WORK_TIMEOUT_SECONDS", 0.01):
                with self.assertRaises(ComparisonError) as raised:
                    await retrieve_comparison("TP53")
                self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(len(self.calls), 0)

        async def stalled(request):
            await asyncio.Event().wait()
        self.handler = stalled
        with patch.object(comparisons, "REQUEST_TIMEOUT_SECONDS", 0.01):
            with self.assertRaises(ComparisonError) as raised:
                await retrieve_comparison("TP53")
            self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(self.active, 0)
        self.assertFalse(comparisons.comparison_lock.locked())


if __name__ == "__main__":
    unittest.main()
