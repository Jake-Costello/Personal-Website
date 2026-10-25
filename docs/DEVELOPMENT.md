# Development guide

## Run the frontend

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173`.

The homepage and `/arcade/` are separate Vite HTML entry points. The arcade can be refreshed or opened directly on GitHub Pages without a client-side routing fallback. Its optional WebGL background loads separately from the selector and is never imported by the homepage.

The portfolio runs without a backend, but the protein graph requires the Python service. A missing or unavailable service produces a loading/error state with retry, never a synthetic fallback. Graphs and species comparisons require no API keys. Optional AI explanations require a server-side OpenAI project key.

## Enable live data locally

Follow the [backend setup](../backend/README.md#run-locally-powershell-from-repository-root) to start the service on port 8000. Add its public address to an ignored `.env.development.local` file at the repository root:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart Vite. The explorer retrieves the protein catalog, chooses two distinct random proteins, and loads their STRING network. The selectors offer twelve human proteins with direct-association hints. **Explore network** applies the selected pair, confidence, and neighborhood size. The local environment file keeps the development address out of production builds.

RCSB experimental-structure checks run directly in the browser using public entry and polymer-entity endpoints. They do not need another service or an API key.

See the [AI configuration and evaluation guide](AI-EXPLANATIONS.md) for optional explanations, source grounding, scientific limitations, and spending controls. Enabling configuration alone does not verify billing or provider access; perform a live explanation check after activation. No paid AI requests run on page load.

## Checks

```sh
npm test
npm run build
npm run test:browser
```

Browser checks use installed Microsoft Edge locally and Chromium in CI. Without Edge, install Playwright Chromium and set `CI=1`, or adjust `channel` in `playwright.config.ts`.

Python checks, from the repository root in PowerShell:

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

`npm run format` formats frontend source and configuration. Build output is `dist/`; dependencies, environment files, screenshots, and virtual environments are excluded from Git.

## Content and interaction configuration

| Location                       | Purpose                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `src/data/experience.ts`       | Timeline chapters, dates, life stages, stories, skills, and links shared by the game and readable overview. |
| `src/game/route.ts`            | Route spacing derived from story length, reading speed, hold duration, fades, and gaps.                     |
| `src/game/trial.ts`            | Trial obstacles, collision penalties, and the target derived from route length.                             |
| `src/lib/achievements.ts`      | Local progress and reward persistence, with session fallback if storage is blocked.                         |
| `src/data/personal.ts`         | Golf story collections and club mappings.                                                                   |
| `src/data/trivia.ts`           | Bioinformatics questions, choices, answers, explanations, and sources.                                      |
| `src/data/proteins.ts`         | Curated protein and experimental-structure mappings, rechecked against RCSB when inspected.                 |
| `src/App.tsx`                  | Page sections and project case-study copy.                                                                  |
| `src/arcade/projects.ts`       | Cabinet titles, status, preview copy, planned skills, and live destinations.                                |
| `src/arcade/ArcadeHub.tsx`     | Orbital cabinet selection, keyboard/touch input, and project dialogs.                                       |
| `src/arcade/ArcadeCabinet.tsx` | Cabinet controls and original SVG screen artwork.                                                           |
| `src/arcade/ArcadeShader.tsx`  | ShaderGradient colors, camera, and animation settings.                                                      |

Review route spacing and playability after adding timeline chapters. Progress uses the `personal-website:achievements:v1` local-storage key; there is no account system or public leaderboard. The site does not implement a public resume upload form or automatic resume parser.

See [golf content and achievement editing](GOLF-CONTENT.md) for the per-ball fields, reward messages, and challenge behavior.

## Project Arcade

Use the arrows, project tabs, cabinet joystick, or a horizontal swipe to change cabinets. When the selector itself has keyboard focus, left/right arrows choose a cabinet, A/Enter opens it, and B opens its details. The physical A/B buttons also work with a mouse, touch, or keyboard. Dialogs close with Escape and return focus to the control that opened them.

Protein Playground and Shoreline Run open the existing homepage experiences. Sketch-to-Ride and Warehouse Shift currently open concept previews; their gameplay and AI features are not implemented. The intended first game is a downhill, left-to-right ride generated from a reviewed sketch. The warehouse concept starts with manual inbound, putaway, and outbound work, then uses order earnings to purchase upgrades inspired by real software projects.

The shader uses one canvas, stops its frame loop when paused, and unmounts in hidden tabs. Reduced motion, WebGL failure, and context loss preserve the CSS backdrop and all cabinet interactions. Dependencies are pinned because ShaderGradient's renderer and React Three Fiber peer compatibility need to be checked together. Its unused Framer export is removed by the production build; Framer is not required for this integration.

## Frontend deployment

The [publication workflow](../.github/workflows/pages.yml) checks the application, builds it, and publishes `dist/` to GitHub Pages. The Python service deploys separately using [`render.yaml`](../render.yaml); see [Render setup](../backend/README.md#deploy-on-render).

1. In the GitHub repository's **Settings > Pages**, choose **GitHub Actions** as the source.
2. Set the repository Actions variable `VITE_API_BASE_URL` to the deployed HTTPS API origin, without an endpoint path or trailing slash.
3. For a custom domain or root user site, set `VITE_BASE_PATH` to `/`. Otherwise, the workflow defaults to `/<repository-name>/`.
4. Set backend `ALLOWED_ORIGINS` to the exact frontend origins. A GitHub Pages origin looks like `https://YOUR-USERNAME.github.io`, without the repository path.
5. Push to `main`, then verify the published site and service after the workflow completes.

`VITE_` variables are public build-time values. Keep API keys and other secrets only in the backend host's environment settings. The Python service currently uses one worker; additional workers require a shared cache and rate limiter.

### Custom domain and HTTPS

GitHub Pages hosts the frontend; the domain registrar manages DNS. Configure the custom domain in Pages before pointing DNS to GitHub. Use the current records in [GitHub's custom-domain setup guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), preserve unrelated mail/verification records, and remove conflicting old website records.

After domain validation and certificate provisioning complete, enable **Enforce HTTPS** in Pages settings and verify the apex and `www` addresses. Registrar identity verification, DNS propagation, and GitHub certificate provisioning are separate steps. For Wix-managed domains, see [Wix DNS management](https://support.wix.com/en/article/managing-dns-records-in-your-wix-account).

## Optional contact form

The hosted form stays hidden until configured; the existing contact link remains available.

1. Create a form at [Formspree](https://formspree.io) and configure the receiving email in its dashboard only.
2. Enable CAPTCHA in the form settings. Native submission uses the provider's hosted security check and delivery/error pages. The `_gotcha` honeypot is an additional signal, not a security boundary.
3. Set the repository Actions variable `VITE_CONTACT_FORM_ENDPOINT` to `https://formspree.io/f/YOUR_FORM_ID` and rebuild. For local previews, set it in `.env.development.local`. An empty or invalid endpoint keeps the form hidden.
4. Test an actual submission, inbox delivery, and CAPTCHA behavior before relying on the form. Check the provider's current limits and spam inbox periodically.

The form collects a name, reply email, and message; its notice identifies the processor. There are no file uploads or automatic replies configured. Never put a recipient email, email-service key, or CAPTCHA secret in frontend source or `VITE_` variables. Browser field limits improve the interface; the provider must enforce abuse protection.

Provider references: [spam protection](https://help.formspree.io/articles/troubleshooting/how-to-prevent-spam), [CAPTCHA settings](https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings), and [rate limits](https://help.formspree.io/articles/form-and-project-settings/system-limits).
