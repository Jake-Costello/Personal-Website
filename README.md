# Jacob Costello — Personal Website

A portfolio with a playable jetski career journey, project case studies, and a protein-network explorer. Built with React, TypeScript, and Vite for static hosting on GitHub Pages, with an optional Python API service.

## Run the site

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173`.

The portfolio and interactive graph work without a backend. The graph starts with explicitly labeled illustrative data. No AI calls, API keys, or paid services are required.

## Enable live protein data locally

Follow [the backend setup](backend/README.md) to start the Python service on port 8000. Add this public address to an ignored `.env.development.local` file at the repository root:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart Vite. In the explorer, select **Fetch live network** to retrieve STRING data and calculate communities with pandas and NetworkX. This setting applies only to development; it does not bake a localhost address into the production build.

## What is implemented

- Responsive portfolio, project detail dialogs, about content, and contact links.
- Original pixel-art jetski scene with acceleration, reversal, pump/jump controls, and five career chapters.
- Revision Marine dock reveal, plus readable timeline navigation, keyboard and touch controls, and reduced-motion support.
- Interactive protein graph with rotation, zoom, confidence filtering, and accessible node selection.
- Optional FastAPI service: STRING identifier resolution, validated data processing, repeatable community detection, caching, and source provenance.
- GitHub Actions workflow for checks and static publication.

Still to come: confirmed personal photos and additional stories, a public Revision Marine site link, optional downloadable resume, embedded molecular structures, grounded AI explanations, and production backend hosting. These are not represented as completed features in the interface.

## Update the resume and timeline

Career content lives in [`src/data/experience.ts`](src/data/experience.ts). The game and readable overview use the same data, so dates, stories, skills, links, and chapter order can change without rebuilding the game mechanics. Chapter numbering follows the data length.

A future resume update can be used to revise this content and the relevant project descriptions. Project case-study copy currently lives in `src/App.tsx`. The repository does not contain a public upload form or automatic resume parser.

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

Planned public address: **jake-costello.com**, registered through Wix. GitHub Pages will host the frontend; Wix will manage the domain's DNS. Connect the GitHub repository first, then configure the custom domain in GitHub Pages and point the Wix DNS records to it. Set `VITE_BASE_PATH` to `/` when enabling the custom domain.

1. Connect this working copy to the intended public GitHub repository.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main`. The workflow checks the application, builds it with the repository subpath, and publishes `dist/`.
4. When the Python service has an HTTPS deployment, set the repository Actions variable `VITE_API_BASE_URL` to that address and rebuild. Set backend `ALLOWED_ORIGINS` to the frontend origin, for example `https://jake-costello.github.io` without the repository path.

The workflow defaults to `/<repository-name>/`. For a root user site or custom domain, set the repository Actions variable `VITE_BASE_PATH` to `/`. GitHub Pages runs the static frontend; the Python service is hosted separately. Never put credentials in `VITE_` variables, which are public build-time values.

## Project reference

See [the requirements and build plan](docs/REQUIREMENTS.md) for the agreed direction. All portfolio work belongs here. Revision Marine is a separate repository and is featured as a case study.
