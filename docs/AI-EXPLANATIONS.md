# Protein network explanations — next integration

Status: proposed; no model, AI endpoint, or paid AI calls are connected yet. The existing Render service can host the integration; an additional hosting service is not required.

## Visitor experience

After a real graph loads, an **Explain this network** action would produce a short overview, community descriptions, notable connections, and the limits of the result. It should cite the source material and distinguish computed groups from established biological pathways. A disconnected pair should receive an honest explanation of the returned data, not a fabricated link.

## Data and implementation

1. Retrieve the selected graph on the server and calculate counts, strongest links, connected components, and community membership deterministically. Include the confidence, neighborhood size, and retrieval time.
2. Retrieve attributed protein descriptions for the displayed proteins. The catalog already supplies STRING annotations for the 12 selectable proteins; added neighbors need their own validated source descriptions before biological explanations are generated.
3. Send that bounded evidence to an OpenAI model through the Responses API. The model explains the evidence; NetworkX remains responsible for community detection. Treat external annotations as data, not instructions.
4. Request structured output for the overview, communities, caveats, and evidence references. Validate references against server-provided source IDs and render their URLs from the server's source list. Output shape validation does not establish scientific accuracy.
5. Cache by graph/evidence version, confidence, neighborhood size, and prompt/model version. Apply server-side request and generation limits, output-token limits, and provider spending controls. Keep generation on demand so page views alone do not trigger paid AI calls.
6. Evaluate connected, sparse, disconnected, outdated, and unavailable-data cases. Verify counts, citations, absence of invented connections, and useful handling of model refusals/timeouts before enabling the public button.

## Account setup

Create a dedicated OpenAI API project with billing and a small spending limit. Add its project API key to the existing Render service as the secret environment variable `OPENAI_API_KEY`. The key belongs only in Render's environment settings, never in chat, Git, or any `VITE_` variable. Confirm that the variable is configured without sharing its value.

Choose the model and monthly budget before activation; then implement and validate the server endpoint and explanation panel. No database or separate hosting purchase is needed for the first bounded, single-worker version. In-memory request limits reset on restart, so provider spending controls remain important.

Official references: [OpenAI production guidance](https://developers.openai.com/api/docs/guides/production-best-practices), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [STRING API](https://string-db.org/help/api/).
