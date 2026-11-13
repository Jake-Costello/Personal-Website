# Arcade art and control direction

Keep the cabinet finish prototype, Resume Run's existing side artwork, the
projected game screen, keyboard/touch alternatives and the current game mechanics.
Use a joystick and two low-profile round action buttons, rather than oversized
keyboard keycaps. Resume Run's stick steers left/right; Pump and Jump have separate
physical buttons. Warehouse Warrior retains four-way movement and two actions.

## Real references inspected

- [Max Fischer full-size DIY build](https://github.com/maxvfischer/DIY-arcade/tree/8c4ba9dfc8d67571bbb6ff883a0ef619b567dd6c):
  completed-cabinet photographs, top and underside control photographs, and DXF
  panel drawings. `button_panel.dxf` declares millimeter units and has 30mm action
  mounting holes, 24mm smaller holes and 20mm joystick clearances. These are holes,
  not plunger/bezel diameters. Use the build to check hardware, spacing and panel
  construction; its portrait game layout is not the website's screen contract.
- [Ryan Bates TinyCade plans](https://github.com/retrobuiltRyan/TinyCade_13in/tree/ef16612db95cbd0acf7d96f93b1f7ae1699536f2):
  real builds and construction drawings. It is explicitly a 2:3-scale cabinet;
  do not infer full-size control-to-screen proportions from a miniature.
- [Taito Vewlix restoration photographs](https://github.com/ElRojo/vewlix-resto/tree/a8ab7e621de0df011e565546b7a11f92b1c1fa41):
  a useful contrasting commercial shell, trim, speaker and bezel reference. The
  available photo has dismantled control panels; it does not establish button
  dimensions or joystick travel.

No reference photographs, commercial logos, CAD meshes or third-party cabinet
artwork are shipped in the website. New graphics are authored procedural Canvas
art, using the already included fonts. The Slagcoin layout page was blocked by
the environment network policy; no permission changes were made to access it.

## Separate visual identities

**Resume Run — lake / shoreline / retro sports.** Preserve the side waves. Carry
teal/navy water contours and restrained cream/mint accents onto the control panel
and marquee. Use a slanted bold display wordmark based on the site's existing
Space Grotesk font. Leave quiet areas around the joystick and Pump/Jump labels.

**Warehouse Warrior — industrial / shipping / operations.** Use charcoal,
workwear amber, restrained hazard accents, crate symbols, serial/barcode details
and a stamped IBM Plex Mono wordmark. Keep the two action labels clear of both
the button caps and the moving joystick. Its illustration should not repeat the
Resume Run wave art with another color.

## Acceptance

- Check whole-cabinet, panel close-up and active-game views at desktop/tablet/mobile.
- Use a fixed flange and dust cover; only the shaft/grip pivot. Low-profile button
  plungers move into their housings instead of behaving like stacked thick pucks.
- Keep labels and printed artwork registered to the actual control positions.
- Make Resume Run steering release independent of held Pump/Jump inputs.
- Preserve the screen/deck anchors and accessible DOM controls. Realistic hardware
  need not become the only small-screen touch target.
- Recheck resource counts, renderer boundary, control hit areas and recovery.
  Software-GPU lab samples do not certify hardware frame rate or field vitals.
