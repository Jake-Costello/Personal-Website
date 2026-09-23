"""Deterministic tests with synthetic data; no calls to STRING."""

import asyncio
from collections import OrderedDict
from itertools import combinations
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import httpx

from backend.app import app, NetworkRequestLimiter
from backend import app as api_module
from backend.network import PROTEIN_SYMBOLS, build_catalog, build_network, clean_edges, parse_proteins


def edge(left, right, score=0.9, **overrides):
    return {"stringId_A": f"9606.{left}", "stringId_B": f"9606.{right}",
            "preferredName_A": left, "preferredName_B": right,
            "ncbiTaxonId": 9606, "score": score, **overrides}


def mapping(symbol, **overrides):
    return {"queryItem": symbol, "preferredName": symbol, "ncbiTaxonId": 9606,
            "stringId": f"9606.{symbol}", "annotation": f"Description of {symbol}", **overrides}


class NetworkProcessingTests(unittest.TestCase):
    def test_input_is_bounded_and_normalized(self):
        self.assertEqual(parse_proteins(" tp53, cdk2 "), ("CDK2", "TP53"))
        self.assertEqual(parse_proteins("MTOR,AKT1"), ("AKT1", "MTOR"))
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

    def test_pair_only_rejects_unrequested_neighbors(self):
        seeds = [{"id": "9606.A", "label": "A"}, {"id": "9606.B", "label": "B"}]
        with self.assertRaises(ValueError):
            build_network([edge("A", "C")], seeds, 0.4, selected_only=True)
        pair = build_network([edge("A", "B")], seeds, 0.4, selected_only=True)
        self.assertEqual(len(pair["nodes"]), 2)
        self.assertEqual(pair["communities"], 1)

    def test_catalog_connections_use_validated_ids_and_keep_isolated_choices(self):
        choices = [{"id": f"9606.{symbol}", "label": symbol, "name": symbol} for symbol in PROTEIN_SYMBOLS]
        result = build_catalog([edge("TP53", "CDK2", 0.9), edge("CDK2", "TP53", 0.7),
                                edge("MTOR", "AKT1", 0.3)], choices)
        self.assertEqual(len(result["proteins"]), 12)
        self.assertEqual(result["connections"], [{"source": "CDK2", "target": "TP53", "score": 0.9}])
        self.assertEqual(build_catalog([], choices)["connections"], [])
        with self.assertRaises(ValueError):
            build_catalog([edge("TP53", "OUTSIDE_CATALOG")], choices)


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        # An isolated, fixed clock prevents rate-limit state leaking between tests.
        self.now = 100.0
        self.limiter = NetworkRequestLimiter(clock=lambda: self.now)
        limiter_patch = patch("backend.app.network_request_limiter", self.limiter)
        limiter_patch.start()
        self.addCleanup(limiter_patch.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_invalid_requests_never_call_upstream(self):
        with patch("backend.app.retrieve_network", new_callable=AsyncMock) as retrieve:
            for query in ("proteins=UNKNOWN,TP53", "confidence=1.5", "proteins=TP53,TP53", "confidence=nan",
                          "neighbors=1", "neighbors=-1", "neighbors=25", "neighbors=abc"):
                self.assertEqual(self.client.get(f"/api/network?{query}").status_code, 422)
            retrieve.assert_not_called()

    def test_neighbor_options_accept_query_strings_and_preserve_empty_pairs(self):
        payload = {"records": [], "seeds": [{"id": "9606.A", "label": "TP53"},
                                             {"id": "9606.B", "label": "CDK2"}],
                   "retrievedAt": "2026-09-23T12:00:00+00:00"}
        with patch("backend.app.retrieve_network", new_callable=AsyncMock, return_value=(payload, False)) as retrieve:
            for size in (0, 8, 24):
                response = self.client.get(f"/api/network?neighbors={size}")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["neighbors"], size)
                self.assertEqual(len(response.json()["nodes"]), 2)
                self.assertEqual(response.json()["edges"], [])
                self.assertEqual(response.json()["communities"], 2)
                retrieve.assert_awaited_with(("CDK2", "TP53"), size)
            self.assertEqual(self.client.get("/api/network").status_code, 200)
            retrieve.assert_awaited_with(("CDK2", "TP53"), 24)

    def test_catalog_response_exposes_live_provenance(self):
        payload = {"result": {"proteins": [{"symbol": "TP53", "name": "Cellular tumor antigen p53"}],
                              "connections": []}, "retrievedAt": "2026-09-23T12:00:00+00:00"}
        with patch("backend.app.retrieve_catalog", new_callable=AsyncMock, return_value=(payload, True)):
            response = self.client.get("/api/proteins")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["proteins"], payload["result"]["proteins"])
        self.assertEqual(body["connections"], [])
        self.assertEqual(body["source"]["mode"], "live")
        self.assertEqual(body["source"]["retrievedAt"], payload["retrievedAt"])
        self.assertTrue(body["source"]["cached"])

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

    def test_waiting_for_upstream_work_is_bounded_for_both_endpoints(self):
        async def queued(*args):
            await asyncio.Event().wait()

        with patch("backend.app.UPSTREAM_WORK_TIMEOUT_SECONDS", 0.01):
            for path, target in (("/api/network", "retrieve_network"), ("/api/proteins", "retrieve_catalog")):
                with self.subTest(path=path), patch(f"backend.app.{target}", side_effect=queued):
                    response = self.client.get(path)
                    self.assertEqual(response.status_code, 504)

    def test_invalid_catalog_upstream_is_not_exposed_as_live_data(self):
        with patch("backend.app.retrieve_catalog", new_callable=AsyncMock, side_effect=ValueError("bad IDs")):
            response = self.client.get("/api/proteins")
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("source", response.json())

    def test_unapproved_origins_do_not_receive_cors_permission(self):
        response = self.client.get("/health", headers={"Origin": "https://unrelated.example"})
        self.assertNotIn("access-control-allow-origin", response.headers)
        approved = self.client.get("/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(approved.headers["access-control-allow-origin"], "http://localhost:5173")

    def test_sixty_requests_then_rejection_never_reaches_upstream(self):
        payload = {"records": [], "seeds": [{"id": "9606.A", "label": "TP53"}],
                   "retrievedAt": "2026-09-23T12:00:00+00:00"}
        with patch("backend.app.retrieve_network", new_callable=AsyncMock,
                   return_value=(payload, True)) as retrieve:
            for _ in range(60):
                self.assertEqual(self.client.get("/api/network").status_code, 200)
            rejected = self.client.get("/api/network", headers={"Origin": "http://localhost:5173"})
            self.assertEqual(rejected.status_code, 429)
            self.assertEqual(rejected.headers["retry-after"], "60")
            self.assertEqual(rejected.headers["cache-control"], "no-store")
            self.assertEqual(rejected.headers["access-control-allow-origin"], "http://localhost:5173")
            self.assertIn("Retry-After", rejected.headers["access-control-expose-headers"])
            self.assertEqual(retrieve.await_count, 60)
            # Expiry is inclusive: a full window later the same client recovers.
            self.now += 60
            self.assertEqual(self.client.get("/api/network").status_code, 200)
            self.assertEqual(retrieve.await_count, 61)

    def test_health_and_preflight_remain_available_when_network_is_limited(self):
        for _ in range(60):
            self.limiter.try_acquire()
        with patch("backend.app.retrieve_network", new_callable=AsyncMock) as retrieve:
            self.assertEqual(self.client.get("/api/network").status_code, 429)
            for _ in range(65):
                self.assertEqual(self.client.get("/health").status_code, 200)
            preflight = self.client.options("/api/network", headers={
                "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"
            })
            self.assertEqual(preflight.status_code, 200)
            retrieve.assert_not_called()

    def test_invalid_queries_are_also_limited_before_upstream_work(self):
        with patch("backend.app.retrieve_network", new_callable=AsyncMock) as retrieve:
            for _ in range(60):
                self.assertEqual(self.client.get("/api/network?confidence=2").status_code, 422)
            self.assertEqual(self.client.get("/api/network?confidence=2").status_code, 429)
            retrieve.assert_not_called()

    def test_catalog_and_network_share_one_request_budget(self):
        for _ in range(59):
            self.limiter.try_acquire()
        payload = {"result": {"proteins": [], "connections": []}, "retrievedAt": "2026-09-23T12:00:00+00:00"}
        with patch("backend.app.retrieve_catalog", new_callable=AsyncMock, return_value=(payload, True)) as catalog:
            with patch("backend.app.retrieve_network", new_callable=AsyncMock) as network:
                self.assertEqual(self.client.get("/api/proteins").status_code, 200)
                self.assertEqual(self.client.get("/api/network").status_code, 429)
                self.assertEqual(self.client.get("/api/proteins").status_code, 429)
                self.assertEqual(catalog.await_count, 1)
                network.assert_not_called()


class UpstreamCacheTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.now = 100.0
        self.network_cache = OrderedDict()
        for target, value in (("cache", self.network_cache), ("catalog_cache", None),
                              ("upstream_lock", asyncio.Lock()), ("monotonic", lambda: self.now)):
            patcher = patch(f"backend.app.{target}", value)
            patcher.start()
            self.addCleanup(patcher.stop)
        client_patch = patch("backend.app.httpx.AsyncClient", return_value=AsyncMock())
        client_patch.start()
        self.addCleanup(client_patch.stop)

    @staticmethod
    async def respond(client, method, params):
        if method == "get_string_ids":
            return [mapping(symbol) for symbol in params["identifiers"].split("\r")]
        return []

    async def test_catalog_cache_keeps_original_provenance_and_refreshes_after_expiry(self):
        with patch("backend.app.string_request", side_effect=self.respond) as request:
            first, cached = await api_module.retrieve_catalog()
            self.assertFalse(cached)
            self.assertEqual(len(first["result"]["proteins"]), 12)
            self.assertEqual(request.await_count, 2)
            self.assertEqual(request.await_args.args[2]["add_nodes"], 0)
            second, cached = await api_module.retrieve_catalog()
            self.assertTrue(cached)
            self.assertIs(first, second)
            self.assertEqual(first["retrievedAt"], second["retrievedAt"])
            self.assertEqual(request.await_count, 2)
            self.now += api_module.CACHE_TTL_SECONDS
            third, cached = await api_module.retrieve_catalog()
            self.assertFalse(cached)
            self.assertIsNot(first, third)
            self.assertEqual(request.await_count, 4)

    async def test_network_sizes_have_distinct_cached_results(self):
        selected = ("CDK2", "TP53")
        with patch("backend.app.string_request", side_effect=self.respond) as request:
            for size in (0, 8, 24):
                _, cached = await api_module.retrieve_network(selected, size)
                self.assertFalse(cached)
                self.assertEqual(request.await_args.args[2]["add_nodes"], size)
            self.assertEqual(request.await_count, 6)
            for size in (0, 8, 24):
                _, cached = await api_module.retrieve_network(selected, size)
                self.assertTrue(cached)
            self.assertEqual(request.await_count, 6)
            self.assertEqual(len(self.network_cache), 3)

    async def test_cache_evicts_least_recently_used_at_64_entries(self):
        pairs = [tuple(sorted(pair)) for pair in combinations(PROTEIN_SYMBOLS, 2)]
        with patch("backend.app.string_request", side_effect=self.respond):
            for pair in pairs[:64]:
                await api_module.retrieve_network(pair, 0)
            self.assertEqual(len(self.network_cache), 64)
            await api_module.retrieve_network(pairs[0], 0)
            await api_module.retrieve_network(pairs[64], 0)
            self.assertEqual(len(self.network_cache), 64)
            self.assertIn((pairs[0], 0), self.network_cache)
            self.assertNotIn((pairs[1], 0), self.network_cache)
            self.assertIn((pairs[64], 0), self.network_cache)

    async def test_invalid_catalog_data_never_enters_cache(self):
        choices = [mapping(symbol) for symbol in PROTEIN_SYMBOLS]
        for records in ([{"score": 0.8}], [edge("TP53", "UNKNOWN")]):
            with self.subTest(records=records):
                with patch("backend.app.string_request", new_callable=AsyncMock, side_effect=[choices, records]):
                    with self.assertRaises(ValueError):
                        await api_module.retrieve_catalog()
                self.assertIsNone(api_module.catalog_cache)

    async def test_resolution_requires_exact_human_identities(self):
        variants = [[], [mapping("TP53")],
                    [mapping("TP53", ncbiTaxonId=10090), mapping("CDK2")],
                    [mapping("TP53", preferredName="P53"), mapping("CDK2")],
                    [mapping("TP53", queryItem="UNKNOWN"), mapping("CDK2")],
                    [mapping("TP53", stringId="10090.TP53"), mapping("CDK2")],
                    [mapping("TP53", stringId="9606."), mapping("CDK2")],
                    [mapping("TP53", stringId="9606.CDK2"), mapping("CDK2")]]
        for rows in variants:
            with self.subTest(rows=rows), patch("backend.app.string_request", new_callable=AsyncMock, return_value=rows):
                with self.assertRaises(ValueError):
                    await api_module.resolve_proteins(AsyncMock(), ("TP53", "CDK2"))

    async def test_annotation_length_is_bounded_and_missing_annotation_uses_symbol(self):
        rows = [mapping("TP53", annotation="  " + "A" * 600), mapping("CDK2", annotation=None)]
        with patch("backend.app.string_request", new_callable=AsyncMock, return_value=rows):
            proteins = await api_module.resolve_proteins(AsyncMock(), ("TP53", "CDK2"))
        self.assertEqual(proteins[0]["name"], "A" * 500)
        self.assertEqual(proteins[1]["name"], "CDK2")


class NetworkRequestLimiterTests(unittest.TestCase):
    def test_rolling_window_expires_only_old_requests_and_rounds_retry_up(self):
        now = [100.0]
        limiter = NetworkRequestLimiter(limit=2, clock=lambda: now[0])
        self.assertIsNone(limiter.try_acquire())
        now[0] = 130
        self.assertIsNone(limiter.try_acquire())
        self.assertEqual(limiter.try_acquire(), 30)
        now[0] = 159.1
        self.assertEqual(limiter.try_acquire(), 1)
        now[0] = 160
        self.assertIsNone(limiter.try_acquire())
        self.assertEqual(limiter.try_acquire(), 30)

    def test_rejected_traffic_never_extends_window_or_grows_memory(self):
        now = [100.0]
        limiter = NetworkRequestLimiter(clock=lambda: now[0])
        for _ in range(60):
            self.assertIsNone(limiter.try_acquire())
        now[0] = 159
        for _ in range(1000):
            self.assertEqual(limiter.try_acquire(), 1)
        self.assertEqual(len(limiter._timestamps), 60)
        now[0] = 160
        for _ in range(60):
            self.assertIsNone(limiter.try_acquire())
        self.assertEqual(limiter.try_acquire(), 60)


if __name__ == "__main__":
    unittest.main()
