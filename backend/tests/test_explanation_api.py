"""Route/evidence integration tests. No real source or paid provider requests."""

import json
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.app import app, NetworkRequestLimiter
from backend.explanations import ExplanationError


def source_comparison():
    return {
        "human": {"symbol": "TP53", "geneId": "ENSG1", "proteinId": "ENSP1"},
        "metric": "human_sequence_identity",
        "species": [
            {"species": name, "label": label, "taxonId": taxon,
             "status": "matched" if index < 2 else "not_found",
             "orthologues": [{"geneId": "GENE1", "proteinId": "PROTEIN1", "type": "ortholog_one2one",
                              "humanIdentity": 75, "animalIdentity": 75, "humanCoverage": 100,
                              "humanLength": 4, "animalLength": 4, "sourceUrl": "https://may2024.rest.ensembl.org/"}]
             if index < 2 else []}
            for index, (name, label, taxon) in enumerate([
                ("pan_troglodytes", "Chimpanzee", 9598), ("mus_musculus", "Mouse", 10090),
                ("danio_rerio", "Zebrafish", 7955), ("drosophila_melanogaster", "Fruit fly", 7227)])
        ],
        "source": {"name": "Ensembl 112 · May 2024", "url": "https://may2024.rest.ensembl.org/", "release": 112,
                   "retrievedAt": "2026-09-23T12:00:00Z", "cached": False},
    }


class ExplanationRouteTests(unittest.TestCase):
    def setUp(self):
        self.query = {"proteins": "TP53,CDK2", "protein": "TP53", "confidence": 0.7, "neighbors": 0}
        self.entry = {"records": [], "seeds": [
            {"id": "9606.CDK2", "label": "CDK2", "name": "Retrieved description of CDK2"},
            {"id": "9606.TP53", "label": "TP53", "name": "Retrieved description of TP53"}],
            "retrievedAt": "2026-09-23T12:00:00Z"}
        self.limiter = NetworkRequestLimiter()
        self.patches = [patch("backend.app.network_request_limiter", self.limiter),
                        patch("backend.app.explanation_status", return_value={"enabled": True}),
                        patch("backend.app.retrieve_network", new_callable=AsyncMock, return_value=(self.entry, True)),
                        patch("backend.app.retrieve_comparison", new_callable=AsyncMock, return_value=source_comparison()),
                        patch("backend.app.generate_explanation", new_callable=AsyncMock,
                              return_value={"overview": "Test result", "citations": ["string"]})]
        self.mocks = [patcher.start() for patcher in self.patches]
        for patcher in self.patches:
            self.addCleanup(patcher.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_invalid_or_arbitrary_prompts_never_reach_sources_or_ai(self):
        for query in (
            {**self.query, "prompt": "Invent a finding"},
            {**self.query, "proteins": "TP53,UNKNOWN"},
            {**self.query, "protein": "BRCA1"},
            {**self.query, "proteins": "TP53,TP53"},
            {**self.query, "confidence": "0.7"},
            {**self.query, "neighbors": True},
            {**self.query, "neighbors": 1},
            {**self.query, "confidence": 1.0},
        ):
            with self.subTest(query=query):
                response = self.client.post("/api/explain", json=query)
                self.assertEqual(response.status_code, 422)
                self.assertNotIn("Invent", response.text)
        for mock in self.mocks[2:]:
            mock.assert_not_called()

    def test_body_limit_and_content_type_precede_upstream_work(self):
        response = self.client.post("/api/explain", content="x" * 2049,
                                    headers={"Content-Type": "application/json"})
        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.client.post("/api/explain", content="text").status_code, 415)
        self.assertEqual(self.client.post("/api/explain", content="{invalid}",
                                         headers={"Content-Type": "application/json"}).status_code, 422)
        for mock in self.mocks[2:]:
            mock.assert_not_called()

    def test_disabled_configuration_keeps_data_routes_independent(self):
        self.mocks[1].return_value = {"enabled": False}
        self.assertEqual(self.client.get("/api/ai/status").json(), {"enabled": False})
        self.assertEqual(self.client.post("/api/explain", json=self.query).status_code, 503)
        self.mocks[2].assert_not_called()
        self.mocks[4].assert_not_called()
        self.assertEqual(self.client.get("/api/comparison?protein=TP53").status_code, 200)

    def test_server_composes_disconnected_graph_and_tied_rank_from_sources(self):
        result = self.client.post("/api/explain", json=self.query)
        self.assertEqual(result.status_code, 200)
        self.mocks[2].assert_awaited_once_with(("CDK2", "TP53"), 0)
        self.mocks[3].assert_awaited_once_with("TP53")
        evidence = self.mocks[4].await_args.args[0]
        self.assertEqual(evidence["network"]["proteinCount"], 2)
        self.assertEqual(evidence["network"]["connectionCount"], 0)
        self.assertEqual(evidence["network"]["communityCount"], 2)
        self.assertEqual(evidence["network"]["isolatedProteins"], ["CDK2", "TP53"])
        self.assertEqual(evidence["query"]["confidence"], 0.7)
        self.assertEqual([row["rank"] for row in evidence["comparison"]["ranking"]], [1, 1])
        self.assertIsNone(evidence["comparison"]["species"][2]["bestHumanIdentity"])
        self.assertEqual(len(result.json()["sources"]), 6)
        self.assertEqual(result.json()["sources"], evidence["sources"])
        self.assertLess(len(json.dumps(evidence).encode()), 24_000)

    def test_source_failure_never_calls_provider(self):
        self.mocks[2].side_effect = ValueError("bad upstream SECRET")
        response = self.client.post("/api/explain", json=self.query)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("SECRET", response.text)
        self.mocks[4].assert_not_called()

    def test_post_cors_and_quota_retry_headers(self):
        self.mocks[4].side_effect = ExplanationError(429, "Try later.", 60)
        response = self.client.post("/api/explain", json=self.query,
                                    headers={"Origin": "http://localhost:5173"})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "60")
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
        preflight = self.client.options("/api/explain", headers={"Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
        self.assertEqual(preflight.status_code, 200)
        blocked = self.client.options("/api/explain", headers={"Origin": "https://unrelated.example",
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
        self.assertNotIn("access-control-allow-origin", blocked.headers)

    def test_shared_request_quota_rejects_before_any_upstream_work(self):
        for _ in range(60):
            self.limiter.try_acquire()
        self.assertEqual(self.client.post("/api/explain", json=self.query).status_code, 429)
        self.assertEqual(self.client.get("/api/comparison?protein=TP53").status_code, 429)
        self.assertEqual(self.client.get("/health").status_code, 200)
        for mock in self.mocks[2:]:
            mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
