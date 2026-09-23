# Protein explorer service

This Python service turns a small STRING functional-association network into a validated graph with community labels and a reproducible 3D layout. It also supplies a curated protein catalog with real association scores for selector hints. The GitHub Pages frontend displays only retrieved source data; loading and failure states do not substitute synthetic graphs.

## Run locally (PowerShell, from repository root)

```powershell
python -m venv backend/.venv
& backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-lock.txt
& backend/.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

In the frontend's root `.env.development.local`, set `VITE_API_BASE_URL=http://127.0.0.1:8000`, then restart Vite. This keeps the local address out of production builds. The UI loads a random distinct protein pair automatically. **Explore network** applies new selections; failures preserve an existing real graph or show an empty retry state on first load.

For a separate HTTPS deployment, set `ALLOWED_ORIGINS` to exact frontend origins, comma-separated. For GitHub Pages this is `https://YOUR-USERNAME.github.io` (no repository path). Local defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`. Never use `*` to solve a configuration error. Run a single application worker so its upstream request spacing and cache are shared; a multiple-worker deployment needs an external cache and shared limiter first.

GitHub Pages hosts the frontend, and the production Python service runs on Render at [personal-website-protein-api.onrender.com](https://personal-website-protein-api.onrender.com/health). The repository Actions variable `VITE_API_BASE_URL` connects the two. No paid provider or account is needed to run the service locally.

## Deploy on Render

The root [`render.yaml`](../render.yaml) creates one always-on Python web service on the `0.5c-512mb` compute plan (formerly Starter), in Ohio. This plan is currently $7/month for compute, plus applicable taxes or usage overages. Use Render's $0 Hobby workspace. The Blueprint provisions no database, disk, additional frontend, or AI service.

[Deploy the protein API to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FJake-Costello%2FPersonal-Website)

1. Create a Render account using GitHub, choose a Hobby workspace, and add billing information inside Render.
2. Connect Render's GitHub integration to `Jake-Costello/Personal-Website` so future backend deploys can follow passing GitHub checks.
3. Open the deployment link above. Review the single `personal-website-protein-api` service and its paid compute price, then deploy. Keep the root directory at the repository root: the code imports the `backend` package.
4. Once the service is **Live**, copy its actual public `https://...onrender.com` URL. Render may add a suffix to the service name. Its `/health` endpoint should return `{"status":"ok"}`.
5. Set the GitHub repository **Actions variable** `VITE_API_BASE_URL` to that URL, without `/api/network` or a trailing slash. Run **Check and publish portfolio** again. This public URL is not a secret.
6. On the published portfolio, verify the automatic initial request, both protein selectors, connection hints, and **Explore network**. Test pair-only and expanded graphs, retrieval timestamps, cached repeat requests, confidence changes, and usable error messages. Check the Render service's memory and response times with several simultaneous requests before treating its capacity as measured.

The Blueprint pins Python 3.14.3, installs the tested dependency lock, binds Uvicorn to Render's `PORT`, runs one worker, and uses `/health` for health checks. Backend changes deploy after the linked branch's CI checks pass; frontend-only changes do not rebuild the API.

`ALLOWED_ORIGINS` includes the exact portfolio apex, `www`, and GitHub Pages origins. HTTP variants support the existing domain during its HTTPS transition; remove them once HTTPS is enforced. Keep the origins explicit. The `onrender.com` API address works without Wix DNS changes; a custom API subdomain can be added later.

No API key is needed for these STRING requests. The AI integration remains a separate step; future AI secrets belong in Render's environment settings, never Git, frontend build variables, or chat.

References: [Render FastAPI deployment](https://render.com/docs/deploy-fastapi), [Blueprint fields](https://render.com/docs/blueprint-spec), [compute pricing](https://render.com/pricing).

## API contract

`GET /api/proteins`

- Returns `proteins[{symbol,name}]`, `connections[{source,target,score}]`, and `source{name,url,mode,retrievedAt,cached}`. Here connection endpoints are catalog symbols.
- Symbols are curated; descriptions, identities, and direct-association hints are retrieved and validated from STRING. A missing link is not proof that no biological relationship exists.
- The 12 supported human symbols are `TP53`, `CDK2`, `BRCA1`, `BRCA2`, `MDM2`, `ATM`, `CHEK2`, `RAD51`, `PALB2`, `EGFR`, `AKT1`, and `MTOR`.

`GET /api/network?proteins=TP53,CDK2&confidence=0.4&neighbors=8`

- Two distinct proteins from the curated catalog; human organism 9606 only.
- Confidence between 0.4 and 0.95. STRING is fetched at 0.4, then pandas filters locally. The frontend slider previews visible links; fetching again restores links or recalculates groups at the new threshold.
- Resolves symbols into STRING IDs and checks exact symbol/species matches. `neighbors` accepts only `0`, `8`, or `24` (default `24` for existing clients). The frontend starts at `8`. Pair-only requests retain exactly the two seeds, even without a connection. Accepted graphs are bounded to 40 nodes and 2,000 upstream rows.
- Fields: `nodes[{id,label,community,x,y,z}]`, `edges[{source,target,score}]`, `communities`, `confidence`, `neighbors`, and `source{name,url,mode,retrievedAt,cached}`.
- Node IDs retain STRING identity. Coordinates are a seeded force layout, **not molecular coordinates**. Communities are seeded weighted Louvain groups, **not validated biological pathways**. Disconnected seeds are retained.
- `422` for invalid inputs, `429` with `Retry-After` when the shared request allowance is exhausted, `502` for upstream/validation failures, and `504` for upstream timeouts. No silent substitution of demo data.
- `/health` reports service health; `/docs` exposes FastAPI's interactive API documentation.

The service pins upstream requests to [STRING v12.0](https://version-12-0.string-db.org/), uses a caller identity, and waits at least 1.05 seconds between upstream calls. The catalog has one cache entry; networks use a 64-entry LRU cache keyed by normalized pair and neighborhood size. Both expire after 30 minutes. Source timestamps remain the original retrieval time. Cache misses are serialized/coalesced; confidence changes reuse retrieved data. Retrieval has a 25-second total deadline including the upstream queue. A shared allowance of 60 catalog/network requests per rolling minute bounds work across visitors; `/health` remains available. These limits and caches live in one worker's memory and reset on restart. Scaling beyond one worker requires a shared cache and limiter. This application limit does not replace hosting-level traffic protection.

## Validate

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

Tests use synthetic fixtures and a mocked upstream service. They check invalid input, deduplication, score/species validation, inclusive filtering, isolated proteins, repeatable clustering, response provenance, upstream timeouts, and CORS. They never call STRING. Dependency ranges are in `requirements.txt`; `requirements-lock.txt` records the environment actually exercised.

## Current boundaries

The graph supports rotation, zoom, protein selection, and an accessible alternative node list. The curated TP53 link opens the experimental p53–DNA complex [1TUP at RCSB PDB](https://www.rcsb.org/structure/1TUP). An embedded molecular viewer and grounded AI explanations are not implemented; the interface says so. No generated explanation is shown as an AI result.

Primary implementation references: [STRING API](https://string-db.org/help/api/), [NetworkX Louvain](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html), and [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).
