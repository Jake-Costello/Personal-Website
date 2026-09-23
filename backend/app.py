"""A small, bounded STRING proxy. No credentials or AI provider are required."""

import asyncio
from datetime import datetime, timezone
import os
from time import monotonic
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

from backend.network import build_network, parse_proteins

STRING_BASE = "https://version-12-0.string-db.org"
CACHE_TTL_SECONDS = 1800
app = FastAPI(title="Jacob Costello · Protein Explorer", version="0.1.0")
allowed_origins = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
                   allow_credentials=False, allow_methods=["GET"], allow_headers=[])
cache: dict[tuple[str, str], dict[str, Any]] = {}
upstream_lock = asyncio.Lock()
last_upstream_call = 0.0


async def string_request(client: httpx.AsyncClient, method: str,
                         params: dict[str, Any]) -> list[dict[str, Any]]:
    global last_upstream_call
    # Called within upstream_lock. Respect STRING's one-second request spacing.
    await asyncio.sleep(max(0, 1.05 - (monotonic() - last_upstream_call)))
    last_upstream_call = monotonic()
    response = await client.get(f"{STRING_BASE}/api/json/{method}", params={
        **params, "species": 9606, "caller_identity": "jacob-costello-personal-website"
    })
    response.raise_for_status()
    if len(response.content) > 2_000_000:
        raise ValueError("Upstream response is too large.")
    body = response.json()
    if not isinstance(body, list) or any(not isinstance(row, dict) for row in body):
        raise ValueError("Upstream returned an unexpected response.")
    return body


async def retrieve_network(proteins: tuple[str, str]) -> tuple[dict[str, Any], bool]:
    # Six possible unique pairs keep the cache bounded. A lock coalesces misses.
    async with upstream_lock:
        existing = cache.get(proteins)
        if existing and monotonic() - existing["stored"] < CACHE_TTL_SECONDS:
            return existing, True
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            mapped = await string_request(client, "get_string_ids", {
                "identifiers": "\r".join(proteins), "echo_query": 1
            })
            seeds = []
            for protein in proteins:
                match = next((row for row in mapped if row.get("preferredName") == protein
                              and row.get("ncbiTaxonId") == 9606), None)
                if (not match or not isinstance(match.get("stringId"), str)
                        or not match["stringId"].startswith("9606.")):
                    raise ValueError("Could not resolve every selected protein unambiguously.")
                seeds.append({"id": match["stringId"], "label": protein})
            records = await string_request(client, "network", {
                "identifiers": "\r".join(seed["id"] for seed in seeds),
                "required_score": 400, "network_type": "functional", "add_nodes": 24
            })
        # Validate before caching so malformed upstream data is never retained.
        build_network(records, seeds, 0.4)
        entry = {"records": records, "seeds": seeds, "stored": monotonic(),
                 "retrievedAt": datetime.now(timezone.utc).isoformat()}
        cache[proteins] = entry
        return entry, False


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/network")
async def network(proteins: str = Query(default="TP53,CDK2", max_length=40),
                  confidence: float = Query(default=0.4, ge=0.4, le=0.95)) -> dict[str, Any]:
    try:
        selected = parse_proteins(proteins)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    try:
        entry, cached = await retrieve_network(selected)
        result = build_network(entry["records"], entry["seeds"], confidence)
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="STRING took too long to respond. Please retry.") from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="STRING data could not be retrieved or validated. Please retry.") from error
    return {**result, "source": {
        "name": "STRING v12.0 · human functional associations", "url": f"{STRING_BASE}/",
        "retrievedAt": entry["retrievedAt"], "mode": "live", "cached": cached
    }}
