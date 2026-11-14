# Encore: first playable draft

Encore is an original rock-and-roll card roguelike inspired by Jake's senior
payphone project at The Union in Athens, Ohio. Cleveland informs the music theme;
the game has no affiliation with the Rock & Roll Hall of Fame and uses no museum,
artist or commercial-game artwork, music or logos.

The first draft established the combat/reward loop. The Bellwether iteration adds branching shows, distinct character illustrations, district art styles and event-driven combat feedback. All
art is original SVG/Canvas/CSS with existing fonts. No new packages, services,
production API calls, Spotify integration or AI generation jobs are required.

## Playable structure

| World | Encounters | Boss |
| --- | --- | --- |
| House Shows | Porchlight House / Basement 9; The Living Room / Juniper Kitchen | Saint Static at The Last House |
| Garage Circuit | Rivet Auto / Axle & Sons; Bay Three / The Loading Dock | The Torque Twins at The Motor Court |
| Main Venues | The Velvet Room / Moonrise Theatre; Prism Ballroom / The Observatory | Atlas Electric at The Atlas |
| Final show | Opens after the three world bosses | The Midnight Conductor at Crown Hall |

Start with 80 HP and a ten-card deck: four Riffs, four Backbeats, Dial In and
Feedback. Each turn starts with three beats and five cards. Play attacks, block
and utility cards against a visible enemy intent, then end the turn to resolve it.
Block clears after the enemy turn. Extra draws beyond a ten-card hand enter the
discard pile. Exhausted cards return next battle. The resolving card cannot be
reshuffled into its own draw effect. Feedback reduces the next attack by three.

Regular victories offer three cards; choose one or skip. World bosses recover up
to 20 HP and offer a relic. Relics stack and last for the run. The three options
improve damage, block cards or first-turn beats. Death ends the run. The final
boss is a separate tenth encounter; beating world three alone is not victory.

The seed and decisions determine shuffle/reward results. The default `encore`
seed is reproducible. New seed uses local browser randomness only. Runs currently
live in memory and end when the game is left or reloaded; no save is implied.

At each regular stop choose one of two buildings. Choices change the opponent,
health and intent pattern; preview the first intent before entering. Six branches
converge at three mandatory district bosses and the separate final show. There
are still ten fights per run. The route records played/bypassed buildings; future
stops stay locked. The selected route is part of the deterministic run state.

## Interface

Cards are native buttons with complete accessible labels. Pointer/touch selects
and plays a card directly; 1–9 play hand positions. Cabinet arrows select a card,
Q/Space confirm and E ends the turn or skips a card reward. The HUD shows health,
beats, enemy intent, block and deck-zone counts. Pause/hidden-tab behavior disables
input. The deck inspector, restart, expanded screen, Escape/back and no-WebGL
fallback use the existing arcade shell. Game code loads only when entered.

The cabinet uses payphone side art and a restrained gig-poster palette. There is
no autoplay music, screen shake, flashing or added render loop. Original SVG
performers and street maps use three district treatments: house-show cut-paper
flyers, garage screenprints and venue poster linework. A guitar/score playmat
frames the fight; its outlined card spaces are decorative, not drop targets.
Card deals, attacks, enemy counters and damage/block readouts use finite CSS
animations, pause with the shell and are removed under reduced motion. Persistent
HUD values and the live combat log always carry the results. See
[the Bellwether iteration](ENCORE-BELLWETHER.md) for coverage and limitations. Other cabinets
stop drawing while a game is active. The existing screen projection is retained;
control decks tilt from 8 to 14 degrees. Warehouse now shares the recessed-front
construction pass, with its own trim color and existing industrial artwork.

## Checks and limits

The pure model has regression tests for deterministic replays, legal moves,
card-zone conservation, reshuffling/exhaust, block/weakness, reward identities,
relic/health progression, all four boss gates and permadeath. A simple deterministic
heuristic player completed 68 of 100 `run-N` seeds in the initial probe. That is
rules/playability evidence for that policy, not a difficulty target or proof of fun.
One early reference test used the old `prototype-01` seed, which the heuristic lost
at the final boss. Balance values were retained; the rock-themed reference seed is
`encore`. Initial browser fallback failures came from waiting for a 3D-only camera
attribute in no-WebGL mode; the helper was corrected, not the app's fallback.

Browser checks exercise cabinet play, pause/reset, physical controls, keyboard,
full ten-encounter runs without WebGL, loading recovery and the payphone project
link. Full website/arcade regressions and deployment status are recorded in the PR
and workspace report rather than assumed from the unit tests.

## Next iterations

1. Playtest card clarity, pacing and meaningful offensive/defensive decisions.
2. Extend the branching show route with rest, shop, event and card-removal choices.
3. Expand the card/relic pool, boss mechanics, character poses and attack choreography.
4. Decide save/resume behavior explicitly; it is not implemented in this draft.
5. Review the cabinet angle and hand readability on real phones before more detail.
