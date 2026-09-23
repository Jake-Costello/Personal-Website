"""A small, bounded STRING proxy. No credentials or AI provider are required."""

import asyncio
from collections import OrderedDict, deque
from collections.abc import Callable
from datetime import datetime, timezone
from enum import IntEnum
from math import ceil
import os
from threading import Lock
from time import monotonic
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

from backend.network import PROTEIN_SYMBOLS, build_catalog, build_network, parse_proteins

STRING_BASE = "https://version-12-0.string-db.org"
CACHE_TTL_SECONDS = 1800
MAX_NETWORK_CACHE_ENTRIES = 64
UPSTREAM_WORK_TIMEOUT_SECONDS = 25
NETWORK_REQUEST_LIMIT = 60
NETWORK_REQUEST_WINDOW_SECONDS = 60


class NeighborCount(IntEnum):
    PAIR_ONLY = 0
    SMALL = 8
    EXPANDED = 24


class NetworkRequestLimiter:
    """Single-process sliding window; rejected requests never grow the deque."""

    def __init__(self, limit: int = NETWORK_REQUEST_LIMIT,
                 window_seconds: float = NETWORK_REQUEST_WINDOW_SECONDS,
                 clock: Callable[[], float] = monotonic):
        self.limit = limit
        self.window_seconds = window_seconds
        self.clock = clock
        self._timestamps: deque[float] = deque()
        self._lock = Lock()

    def try_acquire(self) -> int | None:
        """Reserve one request, or return the whole seconds until capacity frees."""
        with self._lock:
            now = self.clock()
            while self._timestamps and self._timestamps[0] <= now - self.window_seconds:
                self._timestamps.popleft()
            if len(self._timestamps) >= self.limit:
                return max(1, ceil(self._timestamps[0] + self.window_seconds - now))
            self._timestamps.append(now)
            return None


network_request_limiter = NetworkRequestLimiter()
app = FastAPI(title="Jacob Costello · Protein Explorer", version="0.2.0")


@app.middleware("http")
async def limit_network_requests(request: Request, call_next):
    # Shared by all visitors, with no dependence on proxy/IP headers. Limit before
    # validation, cache lookup, graph computation, or any upstream work.
    if request.method == "GET" and request.url.path in {"/api/network", "/api/proteins"}:
        retry_after = network_request_limiter.try_acquire()
        if retry_after is not None:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Network request limit reached. Please retry in {retry_after} seconds."},
                headers={"Retry-After": str(retry_after), "Cache-Control": "no-store"},
            )
    return await call_next(request)


allowed_origins = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
# Register CORS last so it also wraps rate-limit responses and preflight requests.
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
                   allow_credentials=False, allow_methods=["GET"], allow_headers=[],
                   expose_headers=["Retry-After"])
cache: OrderedDict[tuple[tuple[str, str], int], dict[str, Any]] = OrderedDict()
catalog_cache: dict[str, Any] | None = None
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


async def resolve_proteins(client: httpx.AsyncClient,
                           proteins: tuple[str, ...]) -> list[dict[str, str]]:
    mapped = await string_request(client, "get_string_ids", {
        "identifiers": "\r".join(proteins), "echo_query": 1, "limit": 1
    })
    if len(mapped) != len(proteins):
        raise ValueError("Could not resolve every selected protein unambiguously.")
    resolved = []
    for protein in proteins:
        matches = [row for row in mapped if row.get("queryItem") == protein
                   and row.get("preferredName") == protein and row.get("ncbiTaxonId") == 9606]
        if len(matches) != 1:
            raise ValueError("Could not resolve every selected protein unambiguously.")
        match = matches[0]
        node_id = match.get("stringId")
        if not isinstance(node_id, str) or not node_id.startswith("9606.") or not 5 < len(node_id) <= 80:
            raise ValueError("STRING returned an invalid protein identity.")
        annotation = match.get("annotation")
        name = annotation.strip()[:500] if isinstance(annotation, str) and annotation.strip() else protein
        resolved.append({"id": node_id, "label": protein, "name": name})
    if len({protein["id"] for protein in resolved}) != len(resolved):
        raise ValueError("STRING resolved distinct proteins to the same identity.")
    return resolved


def source_metadata(entry: dict[str, Any], cached: bool) -> dict[str, Any]:
    return {
        "name": "STRING v12.0 · human functional associations", "url": f"{STRING_BASE}/",
        "retrievedAt": entry["retrievedAt"], "mode": "live", "cached": cached,
    }


async def retrieve_catalog() -> tuple[dict[str, Any], bool]:
    global catalog_cache
    async with upstream_lock:
        if catalog_cache and monotonic() - catalog_cache["stored"] < CACHE_TTL_SECONDS:
            return catalog_cache, True
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            proteins = await resolve_proteins(client, PROTEIN_SYMBOLS)
            records = await string_request(client, "network", {
                "identifiers": "\r".join(protein["id"] for protein in proteins),
                "required_score": 400, "network_type": "functional", "add_nodes": 0,
            })
        result = build_catalog(records, proteins)
        catalog_cache = {"result": result, "stored": monotonic(),
                         "retrievedAt": datetime.now(timezone.utc).isoformat()}
        return catalog_cache, False


async def retrieve_network(proteins: tuple[str, str], neighbors: int = 24) -> tuple[dict[str, Any], bool]:
    # Distinct sizes have distinct cache entries; a shared lock coalesces misses.
    key = (proteins, neighbors)
    async with upstream_lock:
        existing = cache.get(key)
        if existing and monotonic() - existing["stored"] < CACHE_TTL_SECONDS:
            cache.move_to_end(key)
            return existing, True
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            seeds = await resolve_proteins(client, proteins)
            records = await string_request(client, "network", {
                "identifiers": "\r".join(seed["id"] for seed in seeds),
                "required_score": 400, "network_type": "functional", "add_nodes": neighbors
            })
        # Validate before caching so malformed upstream data is never retained.
        build_network(records, seeds, 0.4, selected_only=neighbors == 0)
        entry = {"records": records, "seeds": seeds, "stored": monotonic(),
                 "retrievedAt": datetime.now(timezone.utc).isoformat()}
        cache[key] = entry
        cache.move_to_end(key)
        while len(cache) > MAX_NETWORK_CACHE_ENTRIES:
            cache.popitem(last=False)
        return entry, False


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/network")
async def network(proteins: str = Query(default="TP53,CDK2", max_length=40),
                  confidence: float = Query(default=0.4, ge=0.4, le=0.95),
                  neighbors: NeighborCount = Query(default=NeighborCount.EXPANDED)) -> dict[str, Any]:
    try:
        selected = parse_proteins(proteins)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    try:
        # Includes time queued behind another visitor, not only HTTP response time.
        async with asyncio.timeout(UPSTREAM_WORK_TIMEOUT_SECONDS):
            entry, cached = await retrieve_network(selected, int(neighbors))
        result = build_network(entry["records"], entry["seeds"], confidence, selected_only=neighbors == 0)
    except (httpx.TimeoutException, TimeoutError) as error:
        raise HTTPException(status_code=504, detail="STRING took too long to respond. Please retry.") from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="STRING data could not be retrieved or validated. Please retry.") from error
    return {**result, "neighbors": neighbors, "source": source_metadata(entry, cached)}


@app.get("/api/proteins")
async def proteins() -> dict[str, Any]:
    try:
        async with asyncio.timeout(UPSTREAM_WORK_TIMEOUT_SECONDS):
            entry, cached = await retrieve_catalog()
    except (httpx.TimeoutException, TimeoutError) as error:
        raise HTTPException(status_code=504, detail="STRING took too long to respond. Please retry.") from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="STRING data could not be retrieved or validated. Please retry.") from error
    return {**entry["result"], "source": source_metadata(entry, cached)}
