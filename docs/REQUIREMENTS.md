# Personal Website — Requirements and Build Plan

Agreed direction recorded September 23, 2026.

Implementation update: the React/TypeScript/Vite build includes the portfolio, playable jetski timeline, Revision Marine dock, and interactive protein explorer. GitHub Pages hosts the frontend; a paid Render FastAPI/pandas/NetworkX service supplies live STRING data automatically for two random proteins on page load. Two curated selectors expose real association hints, and neighborhood sizes include just the selected pair. Small and disconnected results remain visible. On-demand comparisons retrieve Ensembl 112 orthologues for chimpanzee, mouse, zebrafish, and fruit fly. Optional OpenAI explanations use server-composed evidence and a $5/month project budget; activation requires server configuration and live provider verification. An embedded molecular viewer remains a later stage. See the root README for current setup and validation instructions; the scope below describes the full intended product.

The intended public domain is **jake-costello.com**, purchased through Wix. Publication requires connecting the GitHub repository, setting the custom domain in GitHub Pages, and updating its DNS records in Wix.

This document separates agreed product behavior from implementation choices and content that still need to be resolved. It is the reference for building the site; new ideas should be evaluated against this scope.

## Purpose and audience

Help employers understand Jacob Costello's engineering experience, judgment, and personality through an enjoyable interactive portfolio.

The current target is the PGA TOUR Forward Deployed Engineer role. Relevant evidence includes translating operational needs into requirements, integrating systems and APIs, deploying reliable workflows, supporting adoption, and demonstrating practical AI. The site should remain useful for other engineering opportunities too.

Success means a visitor can quickly find qualifications and project evidence, explore the career journey, try a working technical demonstration, and contact Jacob.

## Site structure

1. **Introduction:** name, concise professional positioning, and direct entry points to experience, projects, the explorer, and contact.
2. **Experience:** a playable jetski timeline and a readable overview of the same milestones.
3. **Projects:** case studies for Revision Marine, the multifunctional payphone, and the new protein-network explorer.
4. **Protein explorer:** a live demonstration combining external APIs, Python data processing, community detection, interactive visualization, and AI explanations.
5. **About:** photographs, hobbies, and short personal stories.
6. **Contact:** LinkedIn contact and GitHub links, without publishing a personal email or phone number. An optional Formspree form can be enabled after configuring recipient delivery and provider-side CAPTCHA/spam protection. A downloadable resume is a secondary convenience and must omit private contact details.

## Visual direction

- Use saturated color, oversized typography, strong contrast, and expressive graphics inspired by [The Designers Republic](https://www.thedesignersrepublic.com/).
- Create original artwork and a consistent identity for Jacob's site.
- Use pixel art for the jetski and its world, with readable text for career stories and project details.
- Keep information hierarchy and navigation consistent as colors and scenery change.
- Exact palette, typography, scenery, photographs, and sprite design remain open.
- Future seasonal decoration: add small details such as October pumpkins and December Christmas lights while retaining the site's usual palette and layout. Treat these as decorations on the existing setting; implementation is deferred.

The reference homepage was visually inspected: bright yellow, large charcoal text, pink accents, and project names flowing together as navigation. Some project images did not load, so their artwork has not been fully reviewed.

## Jetski experience journey

### Core behavior

- A pixel-art rider travels across a side-scrolling water scene near the bottom of the screen.
- Left and right move the jetski in the corresponding direction, with acceleration and a short turning animation when reversing.
- Down dips the nose and charges a jump; a following up press launches the rider. Tune timing through playtesting.
- Career and life milestones appear above the water as the rider reaches their locations.
- A visitor can stop to read and travel back to earlier milestones.
- Keep each milestone concise, with a path to more detail where useful.
- Optional jumps and discoveries may reveal personal details. Essential career content is reachable without performing jumps.

### Revision Marine reveal

Near the end of the experience, the rider pulls up beside a Revision Marine dock or workshop. Reveal Jacob's role as **founding engineer** of a jetski parts company and connect the setting to his real interests and work. This describes his engineering responsibility, not an ownership claim.

Provide a link to the confirmed company website and a link to the portfolio's Revision Marine case study. The timeline tells the personal story; the case study explains business needs, technical contributions, and implementation decisions.

The confirmed website is [revision-marine.com](https://revision-marine.com/). On September 23, 2026 it opened a password-protected storefront preview; label links accordingly. The founding date remains unconfirmed. Do not imply a public commerce launch without evidence.

### Access and usability

- Provide an experience overview and direct chapter navigation using the same underlying content as the game.
- Support touch controls, keyboard navigation, and reduced motion.
- Keep text readable and selectable, with meaningful document structure for assistive technology.
- Activate game arrow-key handling only while the visitor is using the game; preserve normal page and form navigation elsewhere.
- Keep major site sections reachable without completing the ride.

## Experience content

Use the supplied resume as the starting source. Each story should explain the problem, Jacob's contribution, and the outcome, with technical details available when useful.

| Milestone                                               | Confirmed source material                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component Repair Technologies, August 2021–January 2022 | Python machine-utilization and scheduling analytics; enterprise identity and deployment work                                                      |
| University projects, 2023–2024                          | Multifunctional payphone with Python, SIP/VoIP, Asterisk, concert information, Spotify queueing, and recordings                                   |
| Ohio University, May 2024                               | B.S. in Computer Science                                                                                                                          |
| Sherwin-Williams, July 2024–present                     | Picking-cart integration, robotics order lifecycle, REST APIs, PL/SQL, exception handling, device management, documentation, and training         |
| Revision Marine, date to confirm                        | Founding engineer: built the technology stack; responsible for website, infrastructure, warehousing system, internal apps, and merchandise design |

Do not invent dates for individual projects within the current job, personal milestones, or results. Describe order throughput as system scale; do not turn it into an unmeasured efficiency gain. Use public-safe descriptions and original explanatory diagrams for employer work.

The original community-detection coursework may be referenced accurately as background, but it will not be a separate featured project. The protein explorer is a new project inspired by that experience; the original code and exact method are unavailable.

## Featured project case studies

Each case study should explain the need, Jacob's role, implementation choices, integrations, validation, current status, and results. Include screenshots or demonstrations and source links where available. Clearly distinguish completed features from future work.

### Revision Marine

- Explain the founding engineer role and the business needs behind the storefront and internal systems. Jacob confirmed building the entire technology stack and taking responsibility for the website, infrastructure, warehousing system, internal apps, and merchandise design. Avoid claiming company ownership.
- Show the relevant commerce data flow and selected engineering decisions.
- A read-only review found a separate Next.js storefront and Medusa backend, including a product page connected to Medusa and cart-related components.
- Link the confirmed website from the project, timeline, and about section. Identify its current private-preview status. Specific technical contributions are user-confirmed; public checkout/warehouse functionality has not been evaluated here.
- Work in this portfolio repository does not authorize changes to the separate Revision Marine repository.

### Multifunctional payphone

- Tell the story of the physical installation and its software integrations.
- Explain Python, Asterisk/SIP, concert information, queue additions, recordings, and testing as supported by the supplied resume and any recoverable artifacts.
- Confirm available photographs, code, and working services before defining a live browser demonstration.

### Protein-network explorer

- Present the working demo alongside a short explanation of its data flow and decisions.
- Demonstrate reliable integration, repeatable computation, useful AI output, and understandable results.
- Document acceptance criteria, representative evaluation cases, limitations, and a short setup/handoff guide.

## Off the clock: the personal golf bag

The about section introduces Jacob as a developer, founding engineer, and creative person. Its desktop layout places the heading and short biography on the left, a slim golf-ball collection in the middle, and a separate golf interaction on the right. Keep the section unboxed, with room between the biography and golfer, compact top padding, and the unused space above the drawing removed. Stack these on small screens, with the balls in a horizontal row.

- Show only a small circular grass tee, two markers, the golfer, and a bag to his right near the grass edge. Remove the course backdrop, dashboard framing, and club selection panel.
- The pixel character wears a black hat, blue shirt with white flowers, black pants, and tan shoes, with a light skin tone. Jacob is right-handed; use his requested mirrored stance and swing, with the ball traveling toward the screen. Mirror the tee and impact with the golfer and align the flight origin with the mirrored ball.
- Show the golfer's side profile at address: hips hinged, knees flexed, head looking down, and hands below the near shoulder with an angled shaft reaching the ball. Animate a continuous inclined arc through address, takeaway, wrist hinge, top, delivery, contact, extension, and follow-through. Compute the hand and club paths together in three dimensions so the club keeps its length as it moves around the body; project them into the existing pixel artwork. Turn the shoulders, shirt, arms, and hips together; keep the head steady through contact, then finish tall with the chest facing the target, the club wrapped behind the shoulders, and the trail heel raised over a planted toe. Launch the ball at contact before settling into the finish.
- Clubs stand upright in the bag with parallel shafts and staggered head heights. Use rounded driver/wood heads, compact angled silver irons, and a thin blade putter. Keep head proportions fixed as the shafts change length; use the visible heads as the controls without fanning the shafts apart.
- Use the same club-head artwork for the bag, dragged club, and held club, including the idle pose after a shot. The takeaway moves away and around the body before rising. Let the wrists hinge as the hands rise above the trail shoulder, retain the hinge in early delivery, and release it through contact. Hide only the portions of arms, hands, and shaft that actually pass behind the opaque torso, neck, or head; do not force the hands inside the shirt to conceal them. The clubface turns with the swing and is square toward the camera-facing target at contact. Finish with visible hands at the upper right and the shaft wrapping behind the head. After a 90 ms address pause, use 540 ms for the backswing and 270 ms for the forward swing to contact (2:1 rhythm). Keep the gloved lead left hand nearer the grip butt and the bare trail right hand below it toward the clubhead; draw the lead arm in front where the arms overlap. Join the blue sleeves cleanly to the shirt and fill the pants continuously beneath the tucked hem. In the finish, open the trail knee and shoe toward the viewer while the toe stays planted and the ankle follows the lifted heel.
- Swing references: the supplied multi-angle pose sheets, [PGA First Swing guide](https://pdf.pgalinks.com/p-g-a/FS_Golfers_Guide_1.pdf), [TPI kinematic sequence](https://www.mytpi.com/articles/biomechanics/kinematic-sequence-revisited), and [Trackman swing plane](https://www.trackman.com/blog/what-is-swing-plane). This remains a stylized animation, not a measured biomechanics simulation. The supplied stock illustrations are reference material only and are not site assets.
- The putter shot reveals “Are You Crazy??? Putter off the Tee???” with the existing two-cats fact.
- Initially offer the selected white golf ball and two gray, disabled balls labeled “Mystery achievement” and “Locked.” These are placeholders; achievement tracking and additional colors/fact collections are future work. Candidate unlocks include finishing the resume, completing a future time trial, and following the LinkedIn link. A future pink ball could reveal more personal facts or project ideas.
- Highlight the actual clubs in the bag on hover/focus; dragging a club to the golfer starts the swing. Clicking, tapping, or keyboard activation provides an equivalent action. Use minimal instructions and keep ordinary scrolling available outside club handles.
- The ball flies from the tee out of the local artwork to the center of the viewport. Its classic white surface has recessed dimples, and its large readable face reveals the chosen fact for seven seconds before falling and fading away. Provide **Keep reading**, **Next shot**, and Escape dismissal; text and controls remain visible on small screens.
- Reduced motion skips the approach/fall and keeps the fact available until dismissed. A readable list exposes every story without playing.
- Start with six user-confirmed subjects: originally pursuing animation before choosing computer science, rock climbing, beach volleyball, drawing, two cats, and jetskis. The animation story may mention skills learned at school, but must not imply a completed animation minor.
- Keep facts and their club mapping in `src/data/personal.ts` so new stories can be added without editing animation code. Do not invent cat names, hobby skill levels, travel details, or dates.

## Protein-network explorer

### Visitor flow

1. Choose a prepared example or two proteins within a selected organism.
2. Resolve identifiers and retrieve a small network of related proteins from a public API.
3. Adjust the relationship-confidence threshold and inspect the filtered network.
4. Find communities and see the groups distinguished visually.
5. Rotate, zoom, and select nodes in the network.
6. Select a protein to inspect an available molecular structure in a separate rotatable view.
7. Request a plain-language AI explanation grounded in retrieved annotations and computed statistics, with source links.

Initial scope: a few curated examples, approximately 30–60 proteins per network, and known structure mappings for the examples. Expand open-ended search after the main workflow is reliable.

### Planned technical responsibilities

| Part                                         | Responsibility                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| STRING API                                   | Resolve protein identifiers and retrieve relationships, scores, and annotations          |
| Python and pandas                            | Validate and normalize tables, remove duplicates, filter edges, and summarize data       |
| NetworkX community detection                 | Compute groups from the graph, using a fixed seed where supported for repeatability      |
| Interactive network view                     | Show connections and communities with selection, rotation, and zoom                      |
| RCSB PDB and a molecular viewer such as Mol* | Retrieve and display an existing structure for a selected protein when available         |
| AI explanation                               | Explain the supplied data and computed results with references to the underlying sources |

The implementation uses React/TypeScript for the frontend and FastAPI, pandas, and seeded NetworkX Louvain for the live STRING service. Molecular structures are linked externally; the embedded viewer remains planned. The same paid Render service retrieves cross-species orthologues from the named Ensembl archive and optionally calls OpenAI Responses for grounded explanations. Human sequence identity drives the ranking; the AI explains supplied results rather than inventing scores. OpenAI's monthly project budget is $5, with caching and shared application quotas.

### Scientific distinctions

- Two selected proteins are starting points for an expanded network. Community detection needs the surrounding network to be meaningful.
- Sequence alignment, network community detection, and molecular structure prediction are different tasks. DNA alignment and new structure prediction are outside this version's scope.
- The positions in a network visualization are a layout, not a molecule's physical coordinates.
- A molecular view displays a retrieved structure. Identify its source and whether it is experimental or predicted.
- STRING relationships can include functional associations as well as physical interactions. Label the network type and confidence meaning.
- Computed communities are algorithmic groupings; they are not automatically established biological pathways.
- AI explains available evidence and computed results; it does not determine the communities or invent scientific conclusions.

### Reliability and demonstration quality

- Show loading, empty, invalid-input, upstream-error, and unavailable-structure states.
- Display data source/version and retrieval time; clearly label cached results.
- Cache requests and respect upstream usage guidance. Confirm current API terms and limits during implementation.
- Keep any credentials on the server and bound network sizes and AI requests.
- Keep exploration usable if an AI request fails.
- Provide a readable list or table alongside the visual network.
- Evaluate identifier resolution, filtering, clustering behavior, and whether AI claims are supported by supplied sources.

### Research references

- [STRING API](https://string-db.org/help/api/)
- [STRING confidence scores](https://string-db.org/help/scores/)
- [NetworkX: graph from a pandas edge list](https://networkx.org/documentation/stable/reference/generated/networkx.convert_matrix.from_pandas_edgelist.html)
- [NetworkX: Louvain communities](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html)
- [RCSB PDB Data API](https://data.rcsb.org/)
- [Mol* viewer](https://molstar.org/viewer-docs/query-parameters/)

## Build sequence

1. **Content and visual foundation:** turn the resume into short stories, define page structure and visual direction, and select a stack suited to the agreed scope.
2. **Playable experience prototype:** establish movement, turning, pump/jump, milestone readability, and the dock reveal; verify keyboard, touch, and overview navigation.
3. **Portfolio pages:** build project case studies, about content, and contact paths with confirmed material.
4. **Protein explorer core:** validate one curated end-to-end example, then add filtering, clustering, network interaction, and molecular structures.
5. **AI explanation and evaluation:** add grounded explanations and exercise representative success and failure cases.
6. **Launch preparation:** verify responsive behavior, accessibility, performance, and deployment; finish documentation and confirm public URLs and content.

Prioritize a complete, polished set of features. Introduce additional techniques when they improve a specific visitor experience or demonstrate a meaningful engineering decision.

## Inputs and decisions still open

- Timeline copy, any additional life milestones, and the Revision Marine founding date.
- Revision Marine's public commerce launch status; the confirmed URL currently serves a private preview.
- Personal photographs and additional hobby stories; the initial six golf stories are confirmed.
- Available payphone code, photographs, and demonstration material.
- Exact palette, typography, sprite artwork, and animation treatment.
- Live AI answer evaluation and continued source maintenance. Provider and budget are decided: OpenAI, $5/month, on the existing Render backend; see `docs/AI-EXPLANATIONS.md`.
- Final public contact details and optional downloadable resume.

Resolve these as their build stages approach. They do not reopen the agreed site concept or require another general planning round.
