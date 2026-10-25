# Interactive Portfolio Website

A responsive portfolio combining playable animation, project case studies, live biological data, and optional AI explanations. It demonstrates full-stack implementation, API integration, data visualization, and interactive interface design.

## Site sections

| Section               | What it showcases                                                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interactive timeline  | A pixel-art jetski journey with chapter navigation, staged storytelling, keyboard/touch controls, and an obstacle-based time trial.                                                                                        |
| Selected work         | Project case studies covering the problem, implementation, technical decisions, and supporting links.                                                                                                                      |
| Project Arcade        | A separate interactive project selector with orbiting CSS 3D cabinets, working cabinet buttons, and a ShaderGradient background. Live experiences sit alongside clearly labeled game concepts.                             |
| Protein lab           | Live STRING association networks, community detection, human-to-animal sequence comparisons from Ensembl, verified experimental-structure records from RCSB PDB, and optional explanations grounded in retrieved evidence. |
| Golf and achievements | Animated club interactions, collectible ball styles, seven-second bioinformatics trivia, and locally saved progress shared across site activities.                                                                         |
| Contact               | A contact entry point with an optional hosted form integration that keeps delivery credentials out of the frontend.                                                                                                        |

## Technology and engineering

- **Frontend:** React, TypeScript, Vite, CSS, and custom SVG artwork and animation. Responsive layouts, keyboard navigation, reduced-motion support, and readable alternatives make the interactions usable in different contexts.
- **Arcade rendering:** CSS 3D transforms and SVG cabinet screens, with a separately loaded ShaderGradient/Three.js backdrop. Motion can be paused; reduced-motion and unavailable WebGL use a static background. The homepage does not load the arcade renderer.
- **Backend and data:** Python, FastAPI, HTTPX, pandas, and NetworkX. A bounded REST API validates upstream responses, filters associations, and computes repeatable graph communities and layouts.
- **API reliability:** Caching, duplicate-request coalescing, timeouts, request limits, explicit loading/error states, and visible source provenance. Failed requests do not substitute synthetic results.
- **AI integration:** Optional server-side OpenAI explanations use retrieved evidence, validated citations, cached responses, and limits on paid attempts. Sequence data determines similarity rankings; AI explains them.
- **Delivery and testing:** GitHub Actions checks and publishes the static frontend to GitHub Pages; Render hosts the Python service. TypeScript unit tests, Python unit tests, and Playwright desktop/mobile checks cover behavior across the application.

The network visualization represents protein associations, not molecular coordinates. Species comparisons identify their source release, and missing evidence stays visible.

## Development

Start with the [development guide](docs/DEVELOPMENT.md) for local setup, checks, content locations, and deployment configuration.

- [Backend setup and API contract](backend/README.md)
- [AI configuration and evaluation](docs/AI-EXPLANATIONS.md)
- [Golf content and achievement editing](docs/GOLF-CONTENT.md)
