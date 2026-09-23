"""Deterministic tests with synthetic data; no calls to STRING."""

import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import httpx

from backend.app import app
from backend.network import build_network, clean_edges, parse_proteins


def edge(left, right, score=0.9, **overrides):
    return {"stringId_A": f"9606.{left}", "stringId_B": f"9606.{right}",
            "preferredName_A": left, "preferredName_B": right,
            "ncbiTaxonId": 9606, "score": score, **overrides}


class NetworkProcessingTests(unittest.TestCase):
    def test_input_is_bounded_and_normalized(self):
        self.assertEqual(parse_proteins(" tp53, cdk2 "), ("CDK2", "TP53"))
        for query in ("TP53", "TP53,TP53", "TP53,XYZ", "TP53,CDK2,BRCA1"):
            with self.subTest(query=query), self.assertRaises(ValueError):
                parse_proteins(query)

    def test_cleanup_rejects_bad_scores_species_and_identity(self):
        rows = [edge("A", "B", "0.8"), edge("B", "A", 0.9), edge("A", "A", 1),
                edge("C", "D", float("inf")), edge("E", "F", -1),
                edge("G", "H", "invalid"), edge("I", "J", 0.3),
                edge("K", "L", 1.1), edge("M", "N", ncbiTaxonId=10090),
                edge("O", "P", stringId_A="10090.O"), edge("Q", "R", preferredName_A=None)]
        result = clean_edges(rows, 0.4).to_dict(orient="records")
        self.assertEqual(result, [{"source": "9606.A", "target": "9606.B", "score": 0.9}])

    def test_threshold_is_inclusive_and_can_remove_every_edge(self):
        self.assertEqual(len(clean_edges([edge("A", "B", 0.7)], 0.7)), 1)
        self.assertTrue(clean_edges([edge("A", "B", 0.7)], 0.75).empty)
        self.assertTrue(clean_edges([], 0.4).empty)
        for threshold in (float("nan"), float("inf"), 0.2, 1.1):
            with self.subTest(threshold=threshold), self.assertRaises(ValueError):
                clean_edges([], threshold)

    def test_invalid_upstream_shapes_fail(self):
        for records in ({"error": "missing"}, [None], [{"score": 0.8}], [{}] * 2001):
            with self.subTest(records=str(records)[:40]), self.assertRaises(ValueError):
                clean_edges(records, 0.4)

    def test_separated_cliques_yield_stable_communities(self):
        records = [edge("A", "B"), edge("A", "C"), edge("B", "C"),
                   edge("D", "E"), edge("D", "F"), edge("E", "F")]
        result = build_network(records, [], 0.4)
        second = build_network(list(reversed(records)), [], 0.4)
        self.assertEqual(result, second)
        self.assertEqual(result["communities"], 2)
        communities = {node["label"]: node["community"] for node in result["nodes"]}
        self.assertEqual(communities["A"], communities["B"])
        self.assertNotEqual(communities["A"], communities["D"])
        self.assertTrue(all(-1.01 <= node[axis] <= 1.01 for node in result["nodes"] for axis in "xyz"))

    def test_isolated_seed_proteins_are_preserved(self):
        result = build_network([], [{"id": "9606.A", "label": "A"},
                                    {"id": "9606.B", "label": "B"}], 0.9)
        self.assertEqual(len(result["nodes"]), 2)
        self.assertEqual(result["edges"], [])
        self.assertEqual(result["communities"], 2)


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_invalid_requests_never_call_upstream(self):
        with patch("backend.app.retrieve_network", new_callable=AsyncMock) as retrieve:
            for query in ("proteins=UNKNOWN,TP53", "confidence=1.5", "proteins=TP53,TP53", "confidence=nan"):
                self.assertEqual(self.client.get(f"/api/network?{query}").status_code, 422)
            retrieve.assert_not_called()

    def test_response_exposes_provenance_and_cache_status(self):
        payload = {"records": [edge("A", "B")],
                   "seeds": [{"id": "9606.A", "label": "TP53"}],
                   "retrievedAt": "2026-09-23T12:00:00+00:00"}
        with patch("backend.app.retrieve_network", new_callable=AsyncMock, return_value=(payload, True)):
            response = self.client.get("/api/network?proteins=TP53,CDK2&confidence=0.7")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["source"]["mode"], "live")
        self.assertTrue(result["source"]["cached"])
        self.assertEqual(result["confidence"], 0.7)
        self.assertEqual(len(result["edges"]), 1)

    def test_upstream_timeout_is_recoverable(self):
        with patch("backend.app.retrieve_network", new_callable=AsyncMock,
                   side_effect=httpx.ReadTimeout("timeout")):
            response = self.client.get("/api/network")
        self.assertEqual(response.status_code, 504)
        self.assertIn("retry", response.json()["detail"])

    def test_unapproved_origins_do_not_receive_cors_permission(self):
        response = self.client.get("/health", headers={"Origin": "https://unrelated.example"})
        self.assertNotIn("access-control-allow-origin", response.headers)
        approved = self.client.get("/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(approved.headers["access-control-allow-origin"], "http://localhost:5173")


if __name__ == "__main__":
    unittest.main()
