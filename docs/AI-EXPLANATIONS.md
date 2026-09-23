# Protein comparisons and AI explanations

The existing Render service hosts the comparison and optional OpenAI integration. There is no extra server or database. The monthly OpenAI operating budget is **$5**, separate from Render hosting. AI requires a server-side project key and explicit activation; page loads and species comparisons make no paid AI calls.

## Visitor experience and scientific scope

The graph remains a **human functional-association network from STRING v12.0**. A visitor can compare either selected human protein with chimpanzee, mouse, zebrafish, and fruit fly. This does not measure animal networks or establish cross-species network edges.

Comparisons retrieve orthologues and protein alignments from **Ensembl release 112, May 2024**. The archive is pinned because it responded reliably during integration checks. This is live retrieval of a named historical release, not the latest annotation release. Source release and retrieval time remain visible. Updating the release requires rechecking mappings and evaluation cases.

Rankings use Ensembl's human/query percentage identity: identical aligned residues divided by human protein length, multiplied by 100. The server validates that percentage against the alignment. Animal identity uses the animal length instead. Human alignment coverage describes residues paired with animal residues; it differs from identity. Results refer to identified representative protein sequences, not every isoform.

All returned candidates are preserved. Each species' bar uses its highest identity candidate; ties remain ties. One-to-many orthology is disclosed. Missing results are **not** 0% identity or proof of biological absence. Unavailable requests are distinguished from successful lookups returning no orthologue.

## Grounded explanation flow

1. The browser sends two human symbols, a comparison symbol, confidence, and neighborhood size. Unknown fields and arbitrary prompts are rejected.
2. The server retrieves authoritative graph/comparison data and computes counts, isolated proteins, community membership, strongest associations, and tied ranks. Attributed STRING descriptions cover the two seed proteins; neighboring proteins without supplied descriptions cannot receive invented functions.
3. Bounded evidence, sources, and fixed instructions go to OpenAI Responses. External annotations are data, never instructions. The approved model is `gpt-6-luna`, reasoning effort `none`, `store: false`, and at most 1,600 output tokens.
4. Structured output contains overview, network, comparison, significance, limitations, and source IDs. Local validation checks shape, size, completion, and citation membership. Clickable URLs come from the server. The frontend renders plain text.
5. Cache entries include scientific evidence, retrieval dates, settings, model, and prompt version and last up to 24 hours. Delivery-cache flags do not invalidate an explanation; a new source retrieval timestamp does. Identical concurrent requests share one generation.

Instructions distinguish functional association from binding, algorithmic groups from established pathways, and sequence identity from whole-species similarity. Conservation alone does not establish identical function, disease effects, or animal-model suitability. If evidence cannot support biological significance, the AI must say so. Structured validation does **not** prove scientific correctness; source review and representative live evaluations remain necessary.

## Account setup and activation

1. Create the OpenAI API project **Personal-Website** and configure API billing. ChatGPT subscription billing is separate.
2. In project **Limits → Spend**, set **$5 per month** and enable **Enforce a hard limit**. Alerts alone do not stop usage. Enforcement is not instantaneous, so a small overshoot can occur; this is not a mathematically exact financial ceiling. Check the Usage dashboard periodically.
3. Save a project API key in the existing Render service's **Environment** as `OPENAI_API_KEY`. Keep its value out of chat, Git, frontend files, and every `VITE_` variable.
4. After deploying the new backend, add `AI_EXPLANATIONS_ENABLED=true` in Render and save/redeploy. The default model is `gpt-6-luna`; optional `OPENAI_MODEL` must equal that approved value. An unsupported model disables AI so configuration changes cannot silently select a costlier model.
5. Verify `GET /api/ai/status` returns `{"enabled":true}`. This checks configuration, not billing, key permissions, or model access. Exercise a real explanation and inspect usage before claiming the provider path is verified.
6. Set `AI_EXPLANATIONS_ENABLED=false` to disable AI while retaining graphs and comparisons.

Application limits allow **2 new provider attempts per minute and 20 per rolling 24 hours**, shared across visitors. Failed attempts count; cached results do not consume generation allowance. Evidence is capped at 24 KB, output at 1,600 tokens, and the cache at 128 entries. Requests also share the general 60-per-minute API allowance. These in-memory controls reset on redeploy/restart and require one worker. They support project spend controls rather than acting as a persistent monthly ledger. There are no automatic provider retries.

## API and maintenance

- `GET /api/comparison?protein=TP53`: the fixed four species for one of 12 supported human symbols. Successful comparisons cache for 24 hours; partial/failure results briefly, allowing recovery.
- `GET /api/ai/status`: availability boolean; no key or account details.
- `POST /api/explain` with JSON: `{"proteins":"TP53,CDK2","protein":"TP53","confidence":0.4,"neighbors":8}`. Body limit 2 KB. Comparison protein must belong to the selected pair.
- `422` invalid input; `429` allowance exhausted with `Retry-After`; `503` disabled AI; `502` invalid/unavailable source or provider output; `504` timeout. Exploration remains usable; no fake explanation substitutes for an error.

Automated backend, frontend, and browser tests mock providers and incur no charges. Live source checks cover TP53 (four matches), BRCA1 (missing results), one-to-many candidates, partial outages, and caching. Live model evaluations should cover connected, sparse, and disconnected graphs; check exact counts, scoped rankings/ties, citations, and restrained biological interpretation. Record real provider checks separately from mocked tests. Never print or retain the API key in verification artifacts.

## Primary references

- [Ensembl homology endpoint](https://may2024.rest.ensembl.org/documentation/info/homology_symbol)
- [Ensembl percentage-identity definitions](https://grch37.ensembl.org/Help/View?id=542)
- [STRING API](https://string-db.org/help/api/)
- [OpenAI model specification](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [Structured output](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits)
- [OpenAI production guidance](https://developers.openai.com/api/docs/guides/production-best-practices)
