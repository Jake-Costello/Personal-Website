"""Mocked OpenAI responses only: these tests never spend API credits."""

import asyncio
from collections import OrderedDict
from copy import deepcopy
import json
import os
import unittest
from unittest.mock import patch

import httpx

from backend import explanations as ai


def evidence():
    return {
        "network": {"proteins": ["TP53", "CDK2"], "communities": 2,
                    "source": {"cached": False, "retrievedAt": "2026-09-23T12:00:00Z"}},
        "comparison": {"humanProtein": "TP53", "ranking": [{"species": "mouse", "identity": 76.8}],
                       "source": {"cached": False, "retrievedAt": "2026-09-23T12:00:00Z"}},
        "sources": [{"id": "string", "title": "STRING", "url": "https://string-db.org/"},
                    {"id": "ensembl", "title": "Ensembl", "url": "https://www.ensembl.org/"}],
    }


def explanation():
    return {
        "overview": "A human protein network and a selected ortholog comparison.",
        "network": "The two algorithmic communities are not established pathways.",
        "comparison": "Mouse identity is 76.8% for this selected protein.",
        "significance": "Similarity can motivate a question, not prove identical function.",
        "limitations": "Restricted species and missing annotations limit this AI explanation.",
        "citations": ["string", "ensembl"],
    }


def provider_payload(result=None):
    return {"status": "completed", "output": [{"type": "message", "role": "assistant",
             "status": "completed", "content": [{"type": "output_text",
             "text": json.dumps(explanation() if result is None else result)}]}]}


class QuotaTests(unittest.TestCase):
    def test_minute_quota_expires_at_boundary_and_rejections_do_not_extend_it(self):
        now = [0.0]
        quota = ai.GenerationQuota(lambda: now[0])
        quota.acquire()
        quota.acquire()
        now[0] = 0.2
        with self.assertRaises(ai.ExplanationError) as error:
            quota.acquire()
        self.assertEqual((error.exception.status_code, error.exception.retry_after), (429, 60))
        self.assertEqual(len(quota.timestamps), 2)
        now[0] = 60
        quota.acquire()
        self.assertEqual(len(quota.timestamps), 3)

    def test_daily_quota_counts_all_attempts_and_recovers_at_boundary(self):
        now = [0.0]
        quota = ai.GenerationQuota(lambda: now[0])
        for attempt in range(20):
            now[0] = attempt * 61
            quota.acquire()
        with self.assertRaises(ai.ExplanationError) as error:
            quota.acquire()
        self.assertEqual(error.exception.status_code, 429)
        self.assertIn("Today's", error.exception.detail)
        self.assertEqual(error.exception.retry_after, 86_400 - 19 * 61)
        self.assertEqual(len(quota.timestamps), 20)
        now[0] = 86_400
        quota.acquire()
        self.assertEqual(len(quota.timestamps), 20)


class ExplanationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.now = 100.0
        self.calls = []
        self.real_client = httpx.AsyncClient
        self.environment = patch.dict(os.environ, {
            "OPENAI_API_KEY": "sk-test-never-a-real-secret",
            "AI_EXPLANATIONS_ENABLED": "true", "OPENAI_MODEL": ai.DEFAULT_MODEL,
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.patches = [
            patch.object(ai, "generation_quota", ai.GenerationQuota(lambda: self.now)),
            patch.object(ai, "generation_lock", asyncio.Lock()),
            patch.object(ai, "explanation_cache", OrderedDict()),
            patch.object(ai, "monotonic", lambda: self.now),
        ]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)

    def provider(self, payload=None, status=200, raw=None, handler=None):
        async def respond(request):
            self.calls.append(request)
            if handler:
                return await handler(request)
            if raw is not None:
                return httpx.Response(status, content=raw)
            return httpx.Response(status, json=provider_payload() if payload is None else payload)

        transport = httpx.MockTransport(respond)
        def client(**kwargs):
            return self.real_client(transport=transport, **kwargs)
        return patch.object(ai.httpx, "AsyncClient", side_effect=client)

    async def test_disabled_missing_key_and_unapproved_model_never_send_a_request(self):
        for settings in ({"AI_EXPLANATIONS_ENABLED": "false"}, {"OPENAI_API_KEY": " "},
                         {"OPENAI_MODEL": "different-model"}):
            with self.subTest(settings=settings), patch.dict(os.environ, settings), self.provider():
                self.assertEqual(ai.explanation_status(), {"enabled": False})
                with self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(evidence())
                self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(self.calls, [])
        self.assertEqual(len(ai.generation_quota.timestamps), 0)

    async def test_request_is_fixed_bounded_and_answer_has_provenance(self):
        with self.provider():
            result = await ai.generate_explanation(evidence())
        self.assertEqual(ai.explanation_status(), {"enabled": True})
        self.assertEqual(len(self.calls), 1)
        request = self.calls[0]
        self.assertEqual(str(request.url), ai.OPENAI_RESPONSES_URL)
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.headers["Authorization"], "Bearer sk-test-never-a-real-secret")
        body = json.loads(request.content)
        self.assertFalse(body["store"])
        self.assertEqual(body["model"], "gpt-6-luna")
        self.assertEqual(body["reasoning"], {"effort": "none"})
        self.assertEqual(body["max_output_tokens"], 1600)
        self.assertNotIn("tools", body)
        self.assertNotIn("sk-test-never-a-real-secret", request.content.decode())
        schema = body["text"]["format"]["schema"]
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["citations"]["items"]["enum"], ["string", "ensembl"])
        self.assertIn("not established biological pathways", body["instructions"])
        self.assertIn("one-to-many", body["instructions"])
        self.assertIn("not zero similarity", body["instructions"])
        self.assertEqual({key: result[key] for key in explanation()}, explanation())
        self.assertFalse(result["cached"])
        self.assertEqual(result["model"], ai.DEFAULT_MODEL)
        self.assertTrue(result["generatedAt"].endswith("Z"))

    async def test_cache_ignores_source_cached_flags_and_returns_independent_values(self):
        with self.provider():
            first = await ai.generate_explanation(evidence())
            changed = evidence()
            changed["network"]["source"]["cached"] = True
            changed["comparison"]["source"]["cached"] = True
            second = await ai.generate_explanation(changed)
            second["citations"].clear()
            third = await ai.generate_explanation(changed)
        self.assertEqual(len(self.calls), 1)
        self.assertTrue(second["cached"])
        self.assertEqual(first["generatedAt"], second["generatedAt"])
        self.assertEqual(third["citations"], ["string", "ensembl"])

    async def test_reasoning_metadata_can_precede_completed_assistant_message(self):
        payload = provider_payload()
        payload["output"].insert(0, {"id": "rs_example", "type": "reasoning", "summary": [],
                                     "encrypted_content": "opaque-not-for-the-browser"})
        with self.provider(payload=payload):
            result = await ai.generate_explanation(evidence())
        self.assertEqual(result["overview"], explanation()["overview"])
        self.assertNotIn("opaque-not-for-the-browser", json.dumps(result))
        self.assertFalse(result["cached"])

    async def test_tools_unknown_items_extra_answers_and_incomplete_metadata_are_rejected(self):
        extra_items = [
            {"type": "function_call", "name": "unexpected", "arguments": "{}"},
            {"type": "unknown", "status": "completed"},
            deepcopy(provider_payload()["output"][0]),
            {"type": "reasoning", "status": "incomplete", "summary": []},
        ]
        payloads = []
        for item in extra_items:
            payload = provider_payload()
            payload["output"].insert(0, item)
            payloads.append(payload)
        excessive = provider_payload()
        excessive["output"] = [{"type": "reasoning", "summary": []}] * 8 + excessive["output"]
        payloads.append(excessive)
        no_message = provider_payload()
        no_message["output"] = [{"type": "reasoning", "summary": []}]
        payloads.append(no_message)
        for payload in payloads:
            self.now += 61
            with self.subTest(payload=payload), self.provider(payload=payload):
                with self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(evidence())
                self.assertEqual(error.exception.status_code, 502)
                self.assertEqual(len(ai.explanation_cache), 0)

    async def test_cache_retains_retrieval_dates_query_and_non_source_cached_data(self):
        base = evidence()
        _, initial, _ = ai._prepare_evidence(base, ai.DEFAULT_MODEL)
        changed_date = deepcopy(base)
        changed_date["network"]["source"]["retrievedAt"] = "2026-09-24T12:00:00Z"
        changed_query = deepcopy(base)
        changed_query["comparison"]["humanProtein"] = "CDK2"
        changed_data = deepcopy(base)
        changed_data["network"]["cached"] = True
        for value in (changed_date, changed_query, changed_data):
            self.assertNotEqual(ai._prepare_evidence(value, ai.DEFAULT_MODEL)[1], initial)
        with patch.object(ai, "PROMPT_VERSION", "next-version"):
            self.assertNotEqual(ai._prepare_evidence(base, ai.DEFAULT_MODEL)[1], initial)

    async def test_identical_concurrent_requests_share_one_generation(self):
        async def slow_response(request):
            await asyncio.sleep(0.02)
            return httpx.Response(200, json=provider_payload())
        with self.provider(handler=slow_response):
            results = await asyncio.gather(*(ai.generate_explanation(evidence()) for _ in range(5)))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len(ai.generation_quota.timestamps), 1)
        self.assertEqual(sum(not result["cached"] for result in results), 1)

    async def test_cached_answers_are_available_after_daily_allowance_used(self):
        with self.provider():
            await ai.generate_explanation(evidence())
            for index in range(19):
                self.now += 61
                ai.generation_quota.acquire()
            cached = await ai.generate_explanation(evidence())
            fresh = evidence()
            fresh["network"]["communities"] = 3
            with self.assertRaises(ai.ExplanationError) as error:
                await ai.generate_explanation(fresh)
        self.assertTrue(cached["cached"])
        self.assertEqual(error.exception.status_code, 429)
        self.assertEqual(len(self.calls), 1)

    async def test_failed_provider_attempts_are_limited_and_redacted(self):
        with self.provider(status=401, raw=b'sk-test-never-a-real-secret private provider details'):
            for _ in range(2):
                with self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(evidence())
                self.assertEqual(error.exception.status_code, 502)
                self.assertNotIn("sk-test", str(error.exception))
                self.assertNotIn("private", str(error.exception))
            with self.assertRaises(ai.ExplanationError) as limited:
                await ai.generate_explanation(evidence())
        self.assertEqual(limited.exception.status_code, 429)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(len(ai.explanation_cache), 0)

    async def test_invalid_evidence_never_consumes_quota_or_provider_call(self):
        too_large = evidence()
        too_large["description"] = "x" * ai.MAX_EVIDENCE_BYTES
        invalid_sources = evidence()
        invalid_sources["sources"][1]["id"] = "string"
        missing_sources = evidence()
        del missing_sources["sources"]
        nonfinite = evidence()
        nonfinite["score"] = float("nan")
        with self.provider():
            for value in (too_large, invalid_sources, missing_sources, nonfinite, []):
                with self.subTest(value=str(value)[:60]), self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(value)
                self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.calls, [])
        self.assertEqual(len(ai.generation_quota.timestamps), 0)

    async def test_refusals_incomplete_and_malformed_output_are_not_cached(self):
        refusal = provider_payload()
        refusal["output"][0]["content"] = [{"type": "refusal", "refusal": "No."}]
        incomplete = provider_payload()
        incomplete["status"] = "incomplete"
        malformed = provider_payload()
        malformed["output"][0]["content"][0]["text"] = "{not JSON}"
        duplicate = provider_payload()
        duplicate["output"][0]["content"][0]["text"] = '{"overview":"A","overview":"B"}'
        invalid_results = [
            {**explanation(), "citations": ["invented"]},
            {**explanation(), "citations": ["string", "string"]},
            {**explanation(), "citations": []},
            {**explanation(), "overview": " "},
            {**explanation(), "overview": "x" * 1201},
            {**explanation(), "overview": "https://invented.example"},
            {**explanation(), "overview": "sk-test-never-a-real-secret"},
            {**explanation(), "extra": "unrecognized"},
        ]
        for payload in [refusal, incomplete, malformed, duplicate,
                        *[provider_payload(value) for value in invalid_results]]:
            self.now += 61
            with self.subTest(payload=str(payload)[:100]), self.provider(payload=payload):
                with self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(evidence())
                self.assertEqual(error.exception.status_code, 502)
                self.assertEqual(len(ai.explanation_cache), 0)
                self.assertNotIn("sk-test", str(error.exception))

    async def test_timeout_transport_error_and_oversized_response_are_redacted(self):
        async def timeout(request):
            raise httpx.ReadTimeout("secret raw timeout", request=request)
        async def transport_error(request):
            raise httpx.ConnectError("secret raw error", request=request)
        for handler, expected in ((timeout, 504), (transport_error, 502)):
            self.now += 61
            with self.provider(handler=handler), self.assertRaises(ai.ExplanationError) as error:
                await ai.generate_explanation(evidence())
            self.assertEqual(error.exception.status_code, expected)
            self.assertNotIn("secret", str(error.exception))
        self.now += 61
        with self.provider(raw=b"x" * (ai.MAX_RESPONSE_BYTES + 1)):
            with self.assertRaises(ai.ExplanationError) as error:
                await ai.generate_explanation(evidence())
            self.assertEqual(error.exception.status_code, 502)

    async def test_cache_expiry_and_lru_bound(self):
        with patch.object(ai, "MAX_CACHE_ENTRIES", 2), self.provider():
            first = evidence()
            second = evidence()
            second["network"]["communities"] = 3
            third = evidence()
            third["network"]["communities"] = 4
            await ai.generate_explanation(first)
            await ai.generate_explanation(second)
            await ai.generate_explanation(first)
            self.now += 61
            await ai.generate_explanation(third)
            self.assertEqual(len(ai.explanation_cache), 2)
            second_key = ai._prepare_evidence(second, ai.DEFAULT_MODEL)[1]
            self.assertNotIn(second_key, ai.explanation_cache)
            self.now += ai.CACHE_TTL_SECONDS
            result = await ai.generate_explanation(first)
        self.assertFalse(result["cached"])
        self.assertEqual(len(self.calls), 4)

    async def test_waiting_for_generation_has_a_bounded_timeout(self):
        await ai.generation_lock.acquire()
        try:
            with patch.object(ai, "LOCK_WAIT_SECONDS", 0.001), self.provider():
                with self.assertRaises(ai.ExplanationError) as error:
                    await ai.generate_explanation(evidence())
            self.assertEqual(error.exception.status_code, 429)
            self.assertEqual(error.exception.retry_after, 60)
            self.assertEqual(self.calls, [])
            self.assertEqual(len(ai.generation_quota.timestamps), 0)
        finally:
            ai.generation_lock.release()


if __name__ == "__main__":
    unittest.main()
