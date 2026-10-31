# BATCH_003 — M1 enemies, ship states, utilities

Assets: 10 · Attach reference images: `references/enemies_board.jpg`, `references/modular_ships.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 10 images of BATCH_003 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `enemy_E01`

- File: `rb_enemy_e01_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M1
- Anchors / layout: centre (256,256); mark nothing — joints are authored in code

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Enemy ship 'Scrap Scout' (role scout): small arrowhead drone. Moves 'zigzag', attacks with 'straight_burst'. Shape must predict its behaviour; distinct silhouette from other enemies. Draw it nose UP like every sprite in this game (the engine rotates it to face the player). Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 2. `enemy_E03`

- File: `rb_enemy_e03_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M1
- Anchors / layout: centre (256,256); mark nothing — joints are authored in code

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Enemy ship 'Shield Barge' (role shield): boxy barge with a frontal shield plate and one exposed rear-side joint. Moves 'slow_line', attacks with 'fan'. Shape must predict its behaviour; distinct silhouette from other enemies. Draw it nose UP like every sprite in this game (the engine rotates it to face the player). Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 3. `hull_H01_lean_left`

- File: `rb_hull_h01_lean_left_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M1
- Anchors / layout: reactor/core centre at (512,560); nose near y=174; hull inside x 204..819, y 163..860
- Note: Same canvas, scale and reactor point across all 5 states of this hull.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Player palette: ivory and charcoal plates with orange accents, cyan energy core and cyan ownership lights. Same H01 hull as the neutral image, banking slightly to the left (about 15 degrees roll, wing on that side lower and foreshortened). Identical size, position and reactor point as the neutral image; bare hull, no guns, no flame. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 4. `hull_H01_lean_right`

- File: `rb_hull_h01_lean_right_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M1
- Anchors / layout: reactor/core centre at (512,560); nose near y=174; hull inside x 204..819, y 163..860
- Note: Same canvas, scale and reactor point across all 5 states of this hull.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Player palette: ivory and charcoal plates with orange accents, cyan energy core and cyan ownership lights. Same H01 hull as the neutral image, banking slightly to the right (about 15 degrees roll, wing on that side lower and foreshortened). Identical size, position and reactor point as the neutral image; bare hull, no guns, no flame. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 5. `hull_H01_damage_overlay`

- File: `rb_hull_h01_damage_overlay_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M1
- Anchors / layout: reactor/core centre at (512,560); nose near y=174; hull inside x 204..819, y 163..860
- Note: Same canvas, scale and reactor point across all 5 states of this hull.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Damage overlay for the H01 hull: ONLY scorch marks, cracks, exposed wiring and small sparks laid out exactly over the hull silhouette of the neutral image; everything else transparent. No hull body painted. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 6. `boss_B02_damage_overlay`

- File: `rb_boss_b02_damage_overlay_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M1
- Anchors / layout: same framing as core
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Scorpion Reclaimer from Graveyard Belt. Damage overlay for the boss body: ONLY cracks, scorch, exposed glowing wiring and sparks laid over the core silhouette; everything else transparent. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 7. `utility_T001`

- File: `rb_utility_t001_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M1
- Anchors / layout: socket (256,409); centred

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Player palette: ivory and charcoal plates with orange accents, cyan energy core and cyan ownership lights. Small ship utility module 'Patch Plating' (effect: core armor +10). Single grid cell, compact device, attachment socket at the bottom centre. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 8. `utility_T006`

- File: `rb_utility_t006_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M1
- Anchors / layout: socket (256,409); centred

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Player palette: ivory and charcoal plates with orange accents, cyan energy core and cyan ownership lights. Small ship utility module 'Tow Winch' (effect: tow acquisition -0.15sec; min0.3). Single grid cell, compact device, attachment socket at the bottom centre. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 9. `enemy_E02`

- File: `rb_enemy_e02_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M3
- Anchors / layout: centre (256,256); mark nothing — joints are authored in code

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Enemy ship 'Needle Interceptor' (role interceptor): fast swept-wing needle fighter. Moves 'sweep', attacks with 'aimed_volley'. Shape must predict its behaviour; distinct silhouette from other enemies. Draw it nose UP like every sprite in this game (the engine rotates it to face the player). Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 10. `enemy_E04`

- File: `rb_enemy_e04_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M3
- Anchors / layout: centre (256,256); mark nothing — joints are authored in code

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Enemy ship 'Fuel Hauler' (role cargo): fuel hauler with big tanks and exposed engine joint. Moves 'cross', attacks with 'none'. Shape must predict its behaviour; distinct silhouette from other enemies. Draw it nose UP like every sprite in this game (the engine rotates it to face the player). Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
