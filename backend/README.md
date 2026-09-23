# Protein explorer service

This optional Python service turns a small STRING functional-association network into a validated graph with community labels and a reproducible 3D layout. The portfolio works independently on GitHub Pages with an explicitly **illustrative** network. That fixture has synthetic edges, confidence scores, and group labels; it is not cached scientific data.

## Run locally (PowerShell, from repository root)

```powershell
python -m venv backend/.venv
& backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
& backend/.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

In the frontend's root `.env.local`, set `VITE_API_BASE_URL=http://127.0.0.1:8000`, then restart Vite. This is a public service address, never a secret. The UI exposes a manual **Fetch live network** action only when configured. It begins in illustrative mode and retains the previous network on failure.

For a separate HTTPS deployment, set `ALLOWED_ORIGINS` to exact frontend origins, comma-separated. For GitHub Pages this is `https://YOUR-USERNAME.github.io` (no repository path). Local defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`. Never use `*` to solve a configuration error. Run a single application worker so its upstream request spacing and cache are shared; a multiple-worker deployment needs an external cache and shared limiter first.

GitHub Pages cannot run this Python service. Deploying it, selecting a provider, and connecting the production URL remain launch tasks. No paid provider or account is needed to run it locally.

## API contract

`GET /api/network?proteins=TP53,CDK2&confidence=0.4`

- Two distinct proteins from `TP53`, `CDK2`, `BRCA1`, and `BRCA2`; human organism 9606 only.
- Confidence between 0.4 and 0.95. STRING is fetched at 0.4, then pandas filters locally. The frontend slider previews visible links; fetching again restores links or recalculates groups at the new threshold.
- Resolves symbols into STRING IDs, checks exact symbol/species matches, expands by 24 neighbors, then limits the accepted graph to 40 nodes and 2,000 upstream rows.
- Fields: `nodes[{id,label,community,x,y,z}]`, `edges[{source,target,score}]`, `communities`, `confidence`, and `source{name,url,mode,retrievedAt,cached}`.
- Node IDs retain STRING identity. Coordinates are a seeded force layout, **not molecular coordinates**. Communities are seeded weighted Louvain groups, **not validated biological pathways**. Disconnected seeds are retained.
- `422` for invalid inputs, `502` for upstream/validation failures, and `504` for upstream timeouts. No silent substitution of demo data.
- `/health` reports service health; `/docs` exposes FastAPI's interactive API documentation.

The service pins upstream requests to [STRING v12.0](https://version-12-0.string-db.org/), uses a caller identity, waits at least 1.05 seconds between upstream calls, and caches the six possible protein pairs for 30 minutes. Source timestamps remain the original retrieval time. Cache misses are serialized/coalesced; confidence changes reuse retrieved data. Before wider public deployment, add ingress rate limiting and a worker-wide cache/limiter if scaling beyond one worker.

## Validate

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

Tests use synthetic fixtures and a mocked upstream service. They check invalid input, deduplication, score/species validation, inclusive filtering, isolated proteins, repeatable clustering, response provenance, upstream timeouts, and CORS. They never call STRING. Dependency ranges are in `requirements.txt`; `requirements-lock.txt` records the environment actually exercised.

## Current boundaries

The graph supports rotation, zoom, protein selection, and an accessible alternative node list. The curated TP53 link opens the experimental p53–DNA complex [1TUP at RCSB PDB](https://www.rcsb.org/structure/1TUP). An embedded molecular viewer and grounded AI explanations are not implemented; the interface says so. No generated explanation is shown as an AI result.

Primary implementation references: [STRING API](https://string-db.org/help/api/), [NetworkX Louvain](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html), and [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).
