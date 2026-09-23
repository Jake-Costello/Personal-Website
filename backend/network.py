"""Pure, repeatable processing of STRING functional-association networks."""

from math import isfinite
from typing import Any

import networkx as nx
import pandas as pd

PROTEIN_SYMBOLS = (
    "TP53", "CDK2", "BRCA1", "BRCA2", "MDM2", "ATM", "CHEK2", "RAD51",
    "PALB2", "EGFR", "AKT1", "MTOR",
)
ALLOWED_PROTEINS = frozenset(PROTEIN_SYMBOLS)
REQUIRED_COLUMNS = (
    "stringId_A", "stringId_B", "preferredName_A", "preferredName_B", "score"
)


def parse_proteins(raw: str) -> tuple[str, str]:
    proteins = tuple(part.strip().upper() for part in raw.split(","))
    if len(proteins) != 2 or len(set(proteins)) != 2:
        raise ValueError("Choose two different proteins, separated by a comma.")
    if any(protein not in ALLOWED_PROTEINS for protein in proteins):
        raise ValueError("Choose two proteins from the playground catalog.")
    return tuple(sorted(proteins))


def clean_edges(records: list[dict[str, Any]], confidence: float) -> pd.DataFrame:
    """Drop invalid rows/self links; merge undirected duplicates by highest score."""
    if not isfinite(confidence) or not 0.4 <= confidence <= 0.95:
        raise ValueError("Confidence must be between 0.4 and 0.95.")
    if not isinstance(records, list) or any(not isinstance(row, dict) for row in records):
        raise ValueError("The network response must be a list of records.")
    if len(records) > 2000:
        raise ValueError("The network response exceeds the prototype size limit.")
    if not records:
        return pd.DataFrame(columns=["source", "target", "score"])
    frame = pd.DataFrame.from_records(records)
    if any(column not in frame.columns for column in REQUIRED_COLUMNS):
        raise ValueError("The network response is missing required fields.")
    frame["score"] = pd.to_numeric(frame["score"], errors="coerce")
    frame = frame.dropna(subset=list(REQUIRED_COLUMNS)).copy()
    for column in ("stringId_A", "stringId_B"):
        frame = frame[frame[column].map(lambda value: isinstance(value, str) and
                                      value.startswith("9606.") and len(value) <= 80)]
    for column in ("preferredName_A", "preferredName_B"):
        frame = frame[frame[column].map(lambda value: isinstance(value, str) and
                                      0 < len(value.strip()) <= 80)]
    if "ncbiTaxonId" in frame.columns:
        frame = frame[pd.to_numeric(frame["ncbiTaxonId"], errors="coerce") == 9606]
    frame = frame[frame["score"].between(confidence, 1, inclusive="both")]
    frame = frame[frame["stringId_A"] != frame["stringId_B"]].copy()
    if frame.empty:
        return pd.DataFrame(columns=["source", "target", "score"])
    frame["source"] = frame.apply(lambda row: min(row["stringId_A"], row["stringId_B"]), axis=1)
    frame["target"] = frame.apply(lambda row: max(row["stringId_A"], row["stringId_B"]), axis=1)
    return (frame[["source", "target", "score"]]
            .groupby(["source", "target"], as_index=False)["score"].max()
            .sort_values(["source", "target"]).reset_index(drop=True))


def build_catalog(records: list[dict[str, Any]], proteins: list[dict[str, str]]) -> dict[str, Any]:
    """Only report associations STRING returned between validated catalog IDs."""
    edges = clean_edges(records, 0.4)
    symbols = {protein["id"]: protein["label"] for protein in proteins}
    connections = []
    for edge in edges.to_dict(orient="records"):
        if edge["source"] not in symbols or edge["target"] not in symbols:
            raise ValueError("The catalog response contains an unexpected protein.")
        source, target = sorted((symbols[edge["source"]], symbols[edge["target"]]))
        connections.append({"source": source, "target": target, "score": edge["score"]})
    return {
        "proteins": [{"symbol": protein["label"], "name": protein["name"]} for protein in proteins],
        "connections": sorted(connections, key=lambda edge: (edge["source"], edge["target"])),
    }


def build_network(records: list[dict[str, Any]], seeds: list[dict[str, str]],
                  confidence: float, selected_only: bool = False) -> dict[str, Any]:
    edges = clean_edges(records, confidence)
    labels: dict[str, str] = {seed["id"]: seed["label"] for seed in seeds}
    if selected_only and (not edges["source"].isin(labels).all()
                          or not edges["target"].isin(labels).all()):
        raise ValueError("A pair-only network contains an unexpected protein.")
    # Labels cannot control identity: STRING IDs remain the graph keys.
    for row in records:
        for suffix in ("A", "B"):
            node_id, label = row.get(f"stringId_{suffix}"), row.get(f"preferredName_{suffix}")
            if isinstance(node_id, str) and isinstance(label, str) and 0 < len(label.strip()) <= 80:
                labels.setdefault(node_id, label.strip())
    graph = nx.Graph()
    graph.add_nodes_from(sorted(seed["id"] for seed in seeds))
    graph.add_weighted_edges_from(edges.itertuples(index=False, name=None))
    if len(graph) > 40:
        raise ValueError("The network response exceeds the 40-protein limit.")
    if graph.number_of_edges():
        groups = nx.community.louvain_communities(graph, weight="weight", seed=17)
    else:
        groups = [{node} for node in graph.nodes]
    # Stable community numbers help compare repeated requests.
    groups = sorted(groups, key=lambda group: min(group))
    memberships = {node: index for index, group in enumerate(groups) for node in group}
    positions = nx.spring_layout(graph, dim=3, seed=17, weight="weight", iterations=70)
    nodes = [{"id": node, "label": labels.get(node, node), "community": memberships[node],
              **{axis: round(float(positions[node][i]), 5) for i, axis in enumerate("xyz")}}
             for node in sorted(graph.nodes)]
    return {"nodes": nodes, "edges": edges.to_dict(orient="records"),
            "communities": len(groups), "confidence": confidence}
