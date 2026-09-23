# Protein explorer service

This optional Python service turns a small STRING functional-association network into a validated graph with community labels and a reproducible 3D layout. The portfolio works independently on GitHub Pages with an explicitly **illustrative** network. That fixture has synthetic edges, confidence scores, and group labels; it is not cached scientific data.

## Run locally (PowerShell, from repository root)

```powershell
python -m venv backend/.venv
& backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-lock.txt
& backend/.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

In the frontend's root `.env.development.local`, set `VITE_API_BASE_URL=http://127.0.0.1:8000`, then restart Vite. This keeps the local address out of production builds. The UI exposes a manual **Fetch live network** action only when configured. It begins in illustrative mode and retains the previous network on failure.

For a separate HTTPS deployment, set `ALLOWED_ORIGINS` to exact frontend origins, comma-separated. For GitHub Pages this is `https://YOUR-USERNAME.github.io` (no repository path). Local defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`. Never use `*` to solve a configuration error. Run a single application worker so its upstream request spacing and cache are shared; a multiple-worker deployment needs an external cache and shared limiter first.

GitHub Pages cannot run this Python service. The repository includes a ready-to-deploy Render Blueprint; creating the Render service and connecting its production URL remain launch tasks. No paid provider or account is needed to run it locally.

## Deploy on Render

The root [`render.yaml`](../render.yaml) creates one always-on Python web service on the `0.5c-512mb` compute plan (formerly Starter), in Ohio. This plan is currently $7/month for compute, plus applicable taxes or usage overages. Use Render's $0 Hobby workspace. The Blueprint provisions no database, disk, additional frontend, or AI service.

[Deploy the protein API to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FJake-Costello%2FPersonal-Website)

1. Create a Render account using GitHub, choose a Hobby workspace, and add billing information inside Render.
2. Connect Render's GitHub integration to `Jake-Costello/Personal-Website` so future backend deploys can follow passing GitHub checks.
3. Open the deployment link above. Review the single `personal-website-protein-api` service and its paid compute price, then deploy. Keep the root directory at the repository root: the code imports the `backend` package.
4. Once the service is **Live**, copy its actual public `https://...onrender.com` URL. Render may add a suffix to the service name. Its `/health` endpoint should return `{"status":"ok"}`.
5. Set the GitHub repository **Actions variable** `VITE_API_BASE_URL` to that URL, without `/api/network` or a trailing slash. Run **Check and publish portfolio** again. This public URL is not a secret.
6. On the published portfolio, select each starting pair and use **Fetch live network**. Verify real STRING data, retrieval timestamps, cached repeat requests, confidence changes, and usable error messages. Check the Render service's memory and response times with several simultaneous requests before treating its capacity as measured.

The Blueprint pins Python 3.14.3, installs the tested dependency lock, binds Uvicorn to Render's `PORT`, runs one worker, and uses `/health` for health checks. Backend changes deploy after the linked branch's CI checks pass; frontend-only changes do not rebuild the API.

`ALLOWED_ORIGINS` includes the exact portfolio apex, `www`, and GitHub Pages origins. HTTP variants support the existing domain during its HTTPS transition; remove them once HTTPS is enforced. Keep the origins explicit. The `onrender.com` API address works without Wix DNS changes; a custom API subdomain can be added later.

No API key is needed for these STRING requests. The AI integration remains a separate step; future AI secrets belong in Render's environment settings, never Git, frontend build variables, or chat.

References: [Render FastAPI deployment](https://render.com/docs/deploy-fastapi), [Blueprint fields](https://render.com/docs/blueprint-spec), [compute pricing](https://render.com/pricing).

## API contract

`GET /api/network?proteins=TP53,CDK2&confidence=0.4`

- Two distinct proteins from `TP53`, `CDK2`, `BRCA1`, and `BRCA2`; human organism 9606 only.
- Confidence between 0.4 and 0.95. STRING is fetched at 0.4, then pandas filters locally. The frontend slider previews visible links; fetching again restores links or recalculates groups at the new threshold.
- Resolves symbols into STRING IDs, checks exact symbol/species matches, expands by 24 neighbors, then limits the accepted graph to 40 nodes and 2,000 upstream rows.
- Fields: `nodes[{id,label,community,x,y,z}]`, `edges[{source,target,score}]`, `communities`, `confidence`, and `source{name,url,mode,retrievedAt,cached}`.
- Node IDs retain STRING identity. Coordinates are a seeded force layout, **not molecular coordinates**. Communities are seeded weighted Louvain groups, **not validated biological pathways**. Disconnected seeds are retained.
- `422` for invalid inputs, `429` with `Retry-After` when the shared request allowance is exhausted, `502` for upstream/validation failures, and `504` for upstream timeouts. No silent substitution of demo data.
- `/health` reports service health; `/docs` exposes FastAPI's interactive API documentation.

The service pins upstream requests to [STRING v12.0](https://version-12-0.string-db.org/), uses a caller identity, waits at least 1.05 seconds between upstream calls, and caches the six possible protein pairs for 30 minutes. Source timestamps remain the original retrieval time. Cache misses are serialized/coalesced; confidence changes reuse retrieved data. A shared allowance of 60 network requests per rolling minute bounds work across all visitors; `/health` remains available. This allowance and cache live in one worker's memory and reset on restart. Scaling beyond one worker requires a shared cache and limiter. This application limit does not replace hosting-level traffic protection.

## Validate

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

Tests use synthetic fixtures and a mocked upstream service. They check invalid input, deduplication, score/species validation, inclusive filtering, isolated proteins, repeatable clustering, response provenance, upstream timeouts, and CORS. They never call STRING. Dependency ranges are in `requirements.txt`; `requirements-lock.txt` records the environment actually exercised.

## Current boundaries

The graph supports rotation, zoom, protein selection, and an accessible alternative node list. The curated TP53 link opens the experimental p53–DNA complex [1TUP at RCSB PDB](https://www.rcsb.org/structure/1TUP). An embedded molecular viewer and grounded AI explanations are not implemented; the interface says so. No generated explanation is shown as an AI result.

Primary implementation references: [STRING API](https://string-db.org/help/api/), [NetworkX Louvain](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html), and [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).
