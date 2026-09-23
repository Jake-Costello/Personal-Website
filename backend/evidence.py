"""Compose small, deterministic scientific evidence; no browser-authored claims."""

from collections import defaultdict
from typing import Any
from urllib.parse import urlencode


def build_evidence(graph: dict[str, Any], seeds: list[dict[str, str]],
                   compared: dict[str, Any], selected: tuple[str, str],
                   neighbors: int) -> dict[str, Any]:
    labels = {node["id"]: node["label"] for node in graph["nodes"]}
    groups: dict[int, list[str]] = defaultdict(list)
    degree = dict.fromkeys(labels, 0)
    for node in graph["nodes"]:
        groups[node["community"]].append(node["label"])
    for edge in graph["edges"]:
        degree[edge["source"]] += 1
        degree[edge["target"]] += 1
    strongest = sorted(graph["edges"], key=lambda edge: (-edge["score"], edge["source"], edge["target"]))[:12]
    sources = [{"id": "string", "title": graph["source"]["name"], "url": graph["source"]["url"]}]
    rows = []
    for species in compared["species"]:
        source_id = "ensembl_" + species["species"]
        url = "https://may2024.rest.ensembl.org/homology/symbol/human/" + compared["human"]["symbol"] + "?" + urlencode({
            "target_species": species["species"], "type": "orthologues", "sequence": "protein", "content-type": "application/json"
        })
        sources.append({"id": source_id, "title": f"Ensembl 112: {compared['human']['symbol']} / {species['label']}", "url": url})
        candidates = sorted(species["orthologues"], key=lambda row: (-row["humanIdentity"], row["proteinId"]))
        # All candidates remain in the public comparison. A bounded subset goes
        # to the model with an explicit count, retaining the deterministically best.
        rows.append({"species": species["species"], "label": species["label"], "status": species["status"],
                     "sourceId": source_id, "candidateCount": len(candidates),
                     "candidatesIncluded": [{key: value for key, value in row.items() if key != "sourceUrl"}
                                            for row in candidates[:8]],
                     "bestHumanIdentity": candidates[0]["humanIdentity"] if candidates else None})
    ranked = sorted((row for row in rows if row["bestHumanIdentity"] is not None),
                    key=lambda row: (-row["bestHumanIdentity"], row["species"]))
    rankings = [{"species": row["species"], "humanIdentity": row["bestHumanIdentity"],
                 "rank": 1 + sum(other["bestHumanIdentity"] > row["bestHumanIdentity"] for other in ranked)}
                for row in ranked]
    sources.append({"id": "ensembl_method", "title": "Ensembl: query and target percentage identity",
                    "url": "https://grch37.ensembl.org/Help/View?id=542"})
    return {
        "query": {"proteins": list(selected), "comparisonProtein": compared["human"]["symbol"],
                  "confidence": graph["confidence"], "neighbors": neighbors},
        "network": {
            "organism": "Homo sapiens", "taxonId": 9606, "proteinCount": len(graph["nodes"]),
            "connectionCount": len(graph["edges"]), "communityCount": graph["communities"],
            "communities": [{"group": group + 1, "proteins": sorted(members)} for group, members in sorted(groups.items())],
            "isolatedProteins": sorted(labels[node_id] for node_id, count in degree.items() if count == 0),
            "strongestAssociations": [{"source": labels[edge["source"]], "target": labels[edge["target"]],
                                        "score": edge["score"]} for edge in strongest],
            "annotations": [{"symbol": seed["label"], "text": seed.get("name", seed["label"]),
                             "possiblyTruncated": len(seed.get("name", "")) == 500, "sourceId": "string"} for seed in seeds],
            "source": graph["source"],
        },
        "comparison": {"human": compared["human"], "metric": compared["metric"],
                       "species": rows, "ranking": rankings, "source": compared["source"]},
        "interpretationRules": [
            "Identity is identical aligned residues divided by the human protein length, multiplied by 100; it is not a probability.",
            "Human coverage is aligned human residues paired with animal residues divided by human length; it differs from identity.",
            "Results describe representative protein sequences in Ensembl release 112, May 2024, retrieved now; this is not the latest release.",
            "Rankings are for this human protein and returned orthologues among only these four animals; missing species are excluded.",
            "One-to-many and many-to-many orthology reflect gene-family history; identity does not establish identical function.",
            "Higher identity can motivate investigating a conserved sequence, but neither biological significance nor animal-model suitability is established by this result.",
            "Only annotations for the two human seed proteins are supplied. Do not invent functions for neighboring proteins.",
        ],
        "sources": sources,
    }
