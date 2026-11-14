# Encore: Bellwether town and stage

Bellwether is a fictional music town. A run starts at house shows, crosses the
garage circuit and main venues, then ends at Crown Hall. It remains an original
rock/payphone game; the payphone senior project itself is still in Athens.

## Decisions on the map

Each of the six regular stops has two venues with different health and intent
patterns. Select an open building, inspect the first intent, then Start battle.
The alternate first show, for example, trades Moth's 22 HP and 5/7 attacks for
Penny Dread's 24 HP and a 3-damage/4-block opener followed by 8 damage. The roads
meet at each district boss. Future stops are locked; played and bypassed shows
remain marked until leaving the district. Ten battles, three relic gates and a
separate final boss are retained. Routes replay from the seed **and choices**.

The street map shows the current district, with a four-part tour indicator above
it when space permits. Compact cabinet view keeps Start battle outside the
scrolling map details; Expand screen provides the larger map and seed controls. On portrait phones
and tablets, expanded/fallback play uses a taller board between the shell tools
and physical controls, leaving the physical cabinet screen unchanged.
Keyboard users can Tab to a building and Enter/Space to select it. Cabinet arrows
select open shows, and Q/Space confirm; touch uses native building buttons.

## Original art direction

| District | Treatment | Performers |
| --- | --- | --- |
| House Shows | Cream cut-paper silhouettes, angular ink, torn flyer backdrops | Moth, Penny Dread, Loose Wires, June Bug, Saint Static |
| Garage Circuit | Cyan/orange screenprints, thick rounded ink, halftone dots and industrial geometry | Rivet, Axle, Short Fuse, Echo Box, The Torque Twins |
| Main Venues | Purple/gold poster linework, concentric arches, curling ornaments and capes | Velvet, Luna Vale, Prism Choir, Nova, Atlas Electric |
| Crown Hall | Midnight blue and gold, grand hall architecture, conductor illustration | The Midnight Conductor |

All sixteen encounters have named, separately configured character illustrations
with different hair, clothing, instruments and stances. The Torque Twins and
Prism Choir are group portraits. Shared performer/instrument construction keeps
the asset code small; these are stylized SVG illustrations, not photorealistic
paintings or commercial-game assets. No external images, fonts, music, services,
paid generation, runtime packages or permission changes are added.

The playmat combines six guitar strings, staff notation, a guitar body and
outlined card spaces. The latter are decoration; this pass does not add summons,
field cards, drag/drop or another game's rules. Actual cards remain native
buttons with complete accessible names and costs/effects.

## Motion and input

Finite CSS effects follow state changes: a 180 ms card deal, a 260 ms opponent
recoil, a 320 ms counter lunge, 280 ms string trails and a 780 ms result readout.
They do not delay resolution or block input. Repeated actions replace the previous
feedback; no animation timer controls combat. Enemy health, block, energy and the
polite log keep results available after effects end. Pausing the shell pauses
animations. Reduced motion disables all game animations/transitions. There is
no screen shake, flashing, audio, particle simulation or permanent animation loop.

## Verification and limits

Model tests cover branch immutability, invalid choices, actual opponent/intent
resolution, route history/reset, all sixteen identities, world/final boss gates,
seeded alternate-route replay and card-zone invariants. Browser checks exercise
real route selection, native keyboard focus, full ten-fight runs, animation and
pause/reduced-motion behavior, cabinet controls, recovery and responsive layout.
Screenshots and actual final check results belong to the accompanying PR/report.

This iteration does not include save/resume, rest/shop/event nodes, card upgrades,
new card/relic pools, music, bespoke boss mechanics or frame-by-frame animation.
Each opponent currently uses a two- or three-turn intent cycle. Route balance and
fun need player feedback; deterministic bot checks are rules evidence only.
Real-device frame pacing and screen-reader testing remain separate work.

Next: playtest branch choices and card readability; add rest/removal or upgrade
choices; build boss-specific rules and more expressive poses; decide save/resume.
