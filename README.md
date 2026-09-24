# Jacob Costello — Personal Website

A portfolio with a playable jetski career journey, project case studies, and a live protein-network explorer. Built with React, TypeScript, and Vite for static hosting on GitHub Pages, with a Python API service on Render.

## Run the site

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173`.

The portfolio runs without a backend, but the protein graph requires the Python service below. It only displays retrieved STRING data: a missing or unavailable service produces a loading/error state with retry, never a synthetic fallback. The graph and species comparisons require no API keys. Optional AI explanations require a server-side OpenAI project key.

## Enable live protein data locally

Follow [the backend setup](backend/README.md) to start the Python service on port 8000. Add this public address to an ignored `.env.development.local` file at the repository root:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart Vite. The explorer automatically retrieves the protein catalog, chooses two distinct random proteins, and loads their STRING network. Two selectors offer a curated list of 12 human proteins with source-backed direct-association hints. **Explore network** applies the chosen pair, confidence, and neighborhood size; **Random pair** starts another exploration. This setting applies only to development; it does not bake a localhost address into the production build.

The production API runs at [personal-website-protein-api.onrender.com](https://personal-website-protein-api.onrender.com/health) on one paid Render Python service configured by [`render.yaml`](render.yaml). The repository Actions variable `VITE_API_BASE_URL` connects the published playground to this service; the portfolio stays on GitHub Pages. Source retrieval times and cached responses remain visible. See the [Render setup](backend/README.md#deploy-on-render) for deployment and maintenance instructions.

## What is implemented

- Responsive portfolio, two Selected Work case studies (Revision Marine and the live protein explorer), project detail dialogs, about content, and contact links. The payphone senior project remains in the resume timeline. Revision Marine identifies Jacob as its founding engineer, describes his software/infrastructure and design responsibilities, and links to its currently private storefront preview from the project, timeline, and about section.
- Original SVG pixel-art stand-up jetski with articulated cruising, crouching, and extended jump poses; acceleration, reversal, pump/jump controls, and fourteen life and career chapters from high-school Java to current warehouse automation. A three-frame rear jet/wake animates while riding; takeoff and landing produce separate splashes anchored to the lake. Reduced-motion mode uses static spray and smaller foam bursts.
- Cleveland lakefront pixel skyline including the Browns stadium, Sherwin-Williams headquarters, generic muted red crown accents on Key Tower, and the Rock Hall's glass pyramid. Includes a taller responsive scene and optional browser full-screen mode. No stock photography or generated image assets are used for the game.
- An unbranded pixel blimp makes one 24-second flyover from right to left when the rider first reaches 84% progress, including jumping directly to a late-career or final chapter. Its timer continues while the rider stops, reverses, changes chapters, or switches to the readable timeline. **Start over** or a new time trial resets the flyover. Reduced-motion mode shows a stationary blimp during the same timed event.
- Larger career stories revealed in stages: title, year, then details at about 300 words per minute at 1× speed. Departure fades details, year, and title in sequence, with 1.8 seconds of open water between stops at the default cruising speed. Reduced-motion mode and the readable timeline show each active story immediately.
- A roughly four-minute route at the default cruising speed, aligned navigable year/story and life-stage tracks, chapter checkpoint dots, and a shoreline progress indicator. Life-stage bars span their associated story columns (2 high school, 5 college, 7 professional career) and scroll together with the years on phones. This is a story-based scale rather than an exact calendar scale. Direct chapter navigation and the readable overview provide shorter ways to explore. Story text keeps revealing when the rider stops.
- Controls sit inside the right edge of the scene with a visible speed readout. Three quick taps on Right increase riding and story-reveal speed; three on Left decrease it through 0.75×, 1×, 1.25×, 1.5×, and 2×. Keyboard arrows and the on-screen buttons both work. Holds, key repeats, slow/mixed taps, and cancelled presses do not change the pace. Chapter navigation preserves speed; Back to start resets it to 1×. Jump physics and the one-time blimp clock keep their original timing.
- A Revision Marine workshop drive-by, followed by a forward-looking final chapter and visible FINISH line. **Start over** and **Time trial** appear at the finish. Completing the story once keeps time trial available on later visits in the same browser. Readable timeline navigation, keyboard and touch controls, and reduced-motion support remain available.
- A repeatable time trial cruises automatically at 2× while visitors pump and jump over 18 chapter-themed obstacles: buoys, a partly submerged plane, bobcat pool floats, and paint cans. Each collision adds four seconds. The current target is 2:16, allowing two hits; the target adjusts with route length. The timer pauses when the game loses focus or leaves the viewport, with explicit resume. Chapter shortcuts and speed changes are disabled during the trial.
- An open about layout with the introduction on the left and an isolated pixel golfer on a small grass tee on the right. Six clubs in the bag reveal stories about animation to computer science, climbing, beach volleyball, drawing, two cats, and jetskis. Hover highlights a club; drag it to the golfer or activate it with a tap/keyboard. A white, dimpled ball flies beyond the artwork to fill the viewport, reveals the fact for seven seconds, then falls away. Keep reading pauses the story; reduced motion and a readable list offer untimed alternatives.
- Beating the time-trial target unlocks a bright yellow golf ball. Choose white or unlocked yellow in the collection to change both the tee ball and flying fact ball. Story completion, best trial score, unlock, and ball selection persist locally in this browser; blocked storage falls back to the current session. The yellow ball uses the same fact collection, with one mystery reward reserved for later.
- Live protein graph with automatic random pairs, two curated selectors, actual STRING connection hints, pair-only/small/wider neighborhoods, rotation, zoom, confidence filtering, and accessible node selection. Disconnected proteins remain visible.
- Live FastAPI service on Render: STRING identifier resolution, validated data processing, repeatable community detection, caching, request limits, and source provenance. Local frontend development can also run without it.
- On-demand comparison of either selected human protein with chimpanzee, mouse, zebrafish, and fruit fly. Live Ensembl archive requests supply orthologues and sequence identity, with ranked bars, candidate details, and explicit missing-data states. The release is pinned to May 2024 and labelled accordingly.
- Optional, source-grounded OpenAI explanations of the human network and species comparison. The server composes the evidence and ranking, validates source references, caches results, and bounds paid attempts. AI requires explicit activation; no paid calls occur on page load.
- GitHub Actions workflow for checks and static publication.

Still to come: confirmed personal photos and additional stories, optional downloadable resume, and embedded molecular structures. These are not represented as completed features in the interface.

The [AI setup and evaluation guide](docs/AI-EXPLANATIONS.md) describes source grounding, activation, scientific limitations, and the $5/month OpenAI budget controls. Configuration status alone does not verify provider billing or model access; perform a live explanation check after enabling it.

## Update the resume and timeline

Career content lives in [`src/data/experience.ts`](src/data/experience.ts). The game and readable overview use the same data, so dates, life stages, stories, skills, links, and chapter order can change without rebuilding the game mechanics. Chapter numbering follows the data length. Each chapter has a lifeStage (high-school, college, or career); both timeline tracks follow that data. Keep revision before the final future chapter so the store is a drive-by and the finish stays beyond it.

Route spacing is calculated from story word counts in `src/game/route.ts`. Adding a checkpoint extends the route while preserving reading time at existing stops. That file also sets the reading speed, hold duration, departure fades, and open-water gaps. The time-trial course and target derive from the same route in `src/game/trial.ts`; chapter IDs map to themed obstacles, with buoys as the default. Review spacing and playability after changing the route. Achievement persistence is handled in `src/lib/achievements.ts` using the `personal-website:achievements:v1` local-storage key; it is a local game reward, with no account or public leaderboard.

Another planned addition is seasonal decoration: pumpkins in October and Christmas lights in December, layered onto the existing site like decorations on a house. Keep the core palette and content intact; this is recorded for a future iteration and is not enabled yet.

A future resume update can be used to revise this content and the relevant project descriptions. Project case-study copy currently lives in `src/App.tsx`. The repository does not contain a public upload form or automatic resume parser.

## Contact and privacy

The published site uses LinkedIn contact. It contains no personal phone number, recipient email, `mailto:` link, or downloadable resume. Keep these details out of future public resume files too. Removing a detail from the current site does not remove it from older Git commits or copies of the repository.

An optional contact form is implemented but stays hidden until configured. To enable it later:

1. Create a form at [Formspree](https://formspree.io) and configure the receiving email **in its dashboard only**.
2. Enable CAPTCHA in the form's settings. The native form submission uses Formspree's hosted security check and delivery/error pages; no browser-side success message claims delivery. Formspree also applies spam filtering and submission rate limits. The `_gotcha` honeypot is an extra signal, not a security boundary.
3. Add the public endpoint `https://formspree.io/f/YOUR_FORM_ID` as the repository Actions variable `VITE_CONTACT_FORM_ENDPOINT`, then run the publication workflow again. An empty or invalid endpoint keeps LinkedIn contact active. For local previews, put the same variable in `.env.development.local`.
4. Test a real submission from the published domain and confirm inbox delivery and CAPTCHA behavior before relying on the form. Check Formspree's current plan limits and spam inbox periodically. There are no file uploads or automatic replies configured by this site.

The form collects a name, reply email, and message; its privacy notice identifies Formspree as the processor. The endpoint is public by design. Never add a recipient email, email-service API key, or CAPTCHA secret to frontend code or a `VITE_` variable. Browser field length limits improve the interface; the provider must enforce actual abuse protection. No public form can guarantee zero spam.

Provider reference: [spam protection](https://help.formspree.io/articles/troubleshooting/how-to-prevent-spam), [CAPTCHA settings](https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings), and [rate limits](https://help.formspree.io/articles/form-and-project-settings/system-limits).

## Check the work

```sh
npm test
npm run build
npm run test:browser
```

Browser checks use installed Microsoft Edge locally and Chromium in CI. On a local machine without Edge, install Playwright Chromium and set `CI=1`, or adjust `channel` in `playwright.config.ts`.

Python checks (PowerShell, from the root):

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

`npm run format` formats frontend source and configuration. Build output is `dist/`; dependencies, environment files, screenshots, and virtual environments are excluded from Git.

## Publish with GitHub Pages

Public address: **jake-costello.com**, registered through Wix. Repository: [Jake-Costello/Personal-Website](https://github.com/Jake-Costello/Personal-Website). GitHub Pages hosts the frontend; Wix manages the domain's DNS. Pages is configured to use GitHub Actions, the custom domain is set, and the repository variable `VITE_BASE_PATH` is `/`. Wix DNS and the HTTPS certificate must be ready before the domain is fully live.

1. Connect this working copy to the intended public GitHub repository.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main`. The workflow checks the application, builds it with the repository subpath, and publishes `dist/`.
4. When the Python service has an HTTPS deployment, set the repository Actions variable `VITE_API_BASE_URL` to that address and rebuild. Set backend `ALLOWED_ORIGINS` to the frontend origin, for example `https://jake-costello.github.io` without the repository path.

The workflow defaults to `/<repository-name>/`. For a root user site or custom domain, set the repository Actions variable `VITE_BASE_PATH` to `/`. GitHub Pages runs the static frontend; the Python service is hosted separately. Never put credentials in `VITE_` variables, which are public build-time values.

### Wix DNS

In **Domains → jake-costello.com → Manage DNS Records**, replace the existing apex A records and the `www` CNAME with:

| Type  | Host name in Wix | Value                     |
| ----- | ---------------- | ------------------------- |
| A     | Leave blank      | `185.199.108.153`         |
| A     | Leave blank      | `185.199.109.153`         |
| A     | Leave blank      | `185.199.110.153`         |
| A     | Leave blank      | `185.199.111.153`         |
| CNAME | `www`            | `jake-costello.github.io` |

Keep Wix nameservers and unrelated MX/TXT records. Do not leave the old Wix apex A values alongside these. Set the custom domain in GitHub Pages before changing DNS. Once GitHub issues the certificate, enable **Enforce HTTPS** in [Pages settings](https://github.com/Jake-Costello/Personal-Website/settings/pages). DNS and certificate availability may take up to 24 hours. Account-level domain verification is also available under personal GitHub Settings → Pages; its unique TXT value must come from GitHub.

Reference: [GitHub custom-domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [Wix DNS management](https://support.wix.com/en/article/managing-dns-records-in-your-wix-account).

## Project reference

Personal golf stories and club mappings live in `src/data/personal.ts`. Revision Marine's URL and preview label live in `src/data/revision.ts`; update the label when the storefront becomes public. Career content remains in `src/data/experience.ts`.

See [the requirements and build plan](docs/REQUIREMENTS.md) for the agreed direction. All portfolio work belongs here. Revision Marine is a separate repository and is featured as a case study.
