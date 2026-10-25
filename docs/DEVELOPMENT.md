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

CI runs the arcade checks with one worker because its 3D scenes share a software renderer. The remaining portfolio checks run separately with three workers. Both groups must pass before publishing.

Python checks, from the repository root in PowerShell:

```powershell
& backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

`npm run format` formats frontend source and configuration. Build output is `dist/`; dependencies, environment files, screenshots, and virtual environments are excluded from Git.

## Content and interaction configuration

| Location                      | Purpose                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/data/experience.ts`      | Timeline chapters, dates, life stages, stories, skills, and links shared by the game and readable overview. |
| `src/game/route.ts`           | Route spacing derived from story length, reading speed, hold duration, fades, and gaps.                     |
| `src/game/trial.ts`           | Trial obstacles, collision penalties, and the target derived from route length.                             |
| `src/lib/achievements.ts`     | Local progress and reward persistence, with session fallback if storage is blocked.                         |
| `src/data/personal.ts`        | Golf story collections and club mappings.                                                                   |
| `src/data/trivia.ts`          | Bioinformatics questions, choices, answers, explanations, and sources.                                      |
| `src/data/proteins.ts`        | Curated protein and experimental-structure mappings, rechecked against RCSB when inspected.                 |
| `src/App.tsx`                 | Page sections and project case-study copy.                                                                  |
| `src/arcade/projects.ts`      | Machine titles, colors, and game-specific control labels.                                                   |
| `src/arcade/ArcadeHub.tsx`    | Machine selection, embedded game mounting, keyboard/touch input, pause and expanded screen modes.           |
| `src/arcade/ArcadeScene.tsx`  | Original Three.js cabinet models, textures, materials, lights, camera movement and screen projection.       |
| `src/arcade/games/`           | Embedded games and pure models for drawing/riding physics and warehouse inventory/economy.                  |
| `src/arcade/input.ts`         | Shared held-button and discrete-action input contract for DOM, keyboard and 3D controls.                    |
| `src/arcade/ArcadeShader.tsx` | ShaderGradient colors, camera, and animation settings.                                                      |

Review route spacing and playability after adding timeline chapters. Progress uses the `personal-website:achievements:v1` local-storage key; there is no account system or public leaderboard. The site does not implement a public resume upload form or automatic resume parser.

See [golf content and achievement editing](GOLF-CONTENT.md) for the per-ball fields, reward messages, and challenge behavior.

## Project Arcade

Resume Run and Warehouse Shift are currently visible. Sketch-to-Ride is temporarily hidden; its game, assets and model tests remain in source. Remove `hidden: true` from its entry in `src/arcade/projects.ts` to restore the cabinet in both the 3D and fallback lobbies. Its game-specific browser tests resume automatically; update the lobby visibility assertions when restoring it.

Use the lobby arrows to browse; click a 3D cabinet or press Enter with the room focused to play. The selected cabinet sits forward under an overhead spotlight. All games run inside the cabinet screen and stay on `/arcade/`. Escape returns to the machines; **Expand screen** provides a larger view. Accessible cabinet targets follow the projected models, and the game screen uses the tilted monitor's full world transform to stay aligned with it. The larger monitor and smaller sloped control deck prioritize readable game content. On-screen controls support touch and keyboard activation.

Resume Run has four physical arrow keys in an inverted T: left/right steer, down pumps, and up jumps. Warehouse has a four-way joystick, Pick (E/Space), and Put away (Q); its upgrades menu is on the monitor. Sketch has a Custom/Levels rocker, four-way joystick, and held Pedal (Space/E) and Brake (Q) buttons. The joystick edits the custom trail while drawing, then left/right tilt the bike while riding. C selects Custom and L selects Levels. Physical and accessible controls share the same input store, including pause, cancellation and lost-focus handling.

Resume Run reuses the existing story, riding physics, trial course and achievement store. Sketch-to-Ride offers ten increasingly long scrolling courses with ramps and collidable hazards. Later courses require braking and leaning. Clear all ten to finish the campaign, or switch to Custom to draw with the joystick, pointer, or touch. Custom uses an overview for editing and a following camera for riding. Head, torso and limb contact with terrain triggers a crash and retry screen; collision capsules use the rendered rider's pose. The courses and drawing are local geometry, not AI interpretation. Edit course names, shapes and obstacles in `src/arcade/games/sketchLevels.ts`.

Warehouse Shift uses shared inventory in sixteen labeled locations on two horizontal racks. Incoming boxes show their putaway destinations; outbound orders request one to three items from named locations. Pick and Put away are independent operations at each location. A complete outbound order pays cash. Daily quotas increase, time limits tighten, and rack inventory carries into the next day. Once the order target is met, players can spend remaining time replenishing stock or end the day. Missing the quota before time expires ends the attempt. Purchased cart and routing upgrades persist through retries and reloads in the validated `jc-warehouse-progress-v1` local-storage record. Cash, inventory and the current shift reset on a new attempt. Pause, hidden tabs and the upgrades menu stop the clock. Edit quotas, time limits and costs in `src/arcade/games/warehouse-model.ts`. Earnings and efficiency are game mechanics, not measured business results. The protein explorer stays on the main portfolio and is not an arcade cabinet.

The cabinet scene renders on demand and uses procedural assets without external model or texture requests. The separate background canvas stops its loop during gameplay or when ambience is paused, and unmounts in hidden tabs. Hidden tabs pause gameplay and clear held input. Reduced motion keeps the 3D models but makes camera moves immediate; WebGL failures fall back to playable flat screens. Each game receives `input` and `active` props and does not install global keyboard listeners. Dependencies are pinned because ShaderGradient and React Three Fiber peer compatibility need to be checked together. The unused Framer export is removed by the production build; Framer is not required.

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
