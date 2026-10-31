# BATCH_017 — Boss parts (B16)

Assets: 5 · Attach reference images: `references/bosses_board.jpg`, `references/salvage_sequence.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 5 images of BATCH_017 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `boss_B16_core`

- File: `rb_boss_b16_core_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M4
- Anchors / layout: core centre (512,512); leave socket for the spinal cannon segment
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Iron Devourer from Eclipse Citadel. Main body: final boss: segmented battleship worm (head segment for the core image). Do NOT include the detachable spinal cannon segment — leave a clear mechanical socket where it attaches. Body only. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 2. `boss_B16_armor`

- File: `rb_boss_b16_armor_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M4
- Anchors / layout: pivot (512,512) = joint centre
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Iron Devourer from Eclipse Citadel. Armour plate that closes over the spinal cannon segment joint: thick curved graphite plate with a CLOSED shield look, separate object. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 3. `boss_B16_joint`

- File: `rb_boss_b16_joint_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M4
- Anchors / layout: pivot (512,512)
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Iron Devourer from Eclipse Citadel. Circular hinge coupling that links the spinal cannon segment to the body: machined metal outer ring and a glowing AMBER inner ring (weak point). Separate object, no surrounding body. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 4. `boss_B16_signature_mount`

- File: `rb_boss_b16_signature_mount_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M4
- Anchors / layout: socket end at (512,870)
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Iron Devourer from Eclipse Citadel. The detachable spinal cannon segment, isolated, at boss scale, exactly as it looks when attached (its socket end at the bottom of the image). This is the part players shoot off and steal. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 5. `boss_B16_damage_overlay`

- File: `rb_boss_b16_damage_overlay_000.png`
- Canvas: 1024x1024 px · blend: alpha · milestone: M4
- Anchors / layout: same framing as core
- Note: Base, joint, armour, damage overlay and detached part must align to the same joint pivot.

```text
Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel materials with restrained wear, chunky readable silhouette that still reads at small phone size. NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene. Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents. Boss Iron Devourer from Eclipse Citadel. Damage overlay for the boss body: ONLY cracks, scorch, exposed glowing wiring and sparks laid over the core silhouette; everything else transparent. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
