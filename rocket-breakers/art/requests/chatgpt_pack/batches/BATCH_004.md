# BATCH_004 — Graveyard Belt backgrounds + core effects

Assets: 8 · Attach reference images: `references/salvage_sequence.jpg`, `references/vfx_concepts.jpg`, `references/fx_explosion.jpg`, `references/fx_shield.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 8 images of BATCH_004 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `bg_P01_far`

- File: `rb_bg_p01_far_000.png`
- Canvas: 1536x2048 px · blend: opaque · milestone: M1
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Graveyard Belt: navy and teal space full of drifting shipwrecks and broken hull plates. FAR layer: deep space backdrop, nebula and distant planet, very low contrast and saturation so bullets stay readable. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: fully opaque painted image that fills the whole canvas edge to edge.
```

## 2. `bg_P01_mid`

- File: `rb_bg_p01_mid_000.png`
- Canvas: 1536x2048 px · blend: alpha · milestone: M1
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Graveyard Belt: navy and teal space full of drifting shipwrecks and broken hull plates. MID layer: mid-distance silhouettes and structures, low contrast, mostly transparent. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge. This is a parallax overlay layer: only foreground elements, the rest fully transparent.
```

## 3. `bg_P01_foreground`

- File: `rb_bg_p01_foreground_000.png`
- Canvas: 1536x2048 px · blend: alpha · milestone: M1
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Graveyard Belt: navy and teal space full of drifting shipwrecks and broken hull plates. FOREGROUND layer: a few close debris pieces near the left and right edges only, centre clear. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge. This is a parallax overlay layer: only foreground elements, the rest fully transparent.
```

## 4. `fx_explosion_small`

- File: `rb_fx_explosion_small_000.png … rb_fx_explosion_small_011.png (12 frames)`
- Canvas: 512x512 px · blend: alpha · milestone: M5
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 12 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 006 and 011 first — code interpolates the rest.

```text
Original game VFX texture: small ship explosion: bright core, orange fire, small metal debris. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 5. `fx_impact_spark`

- File: `rb_fx_impact_spark_000.png … rb_fx_impact_spark_007.png (8 frames)`
- Canvas: 512x512 px · blend: additive · milestone: M1
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 8 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 004 and 007 first — code interpolates the rest.

```text
Original game VFX texture: kinetic impact: gold-white sparks burst. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 6. `fx_joint_break`

- File: `rb_fx_joint_break_000.png … rb_fx_joint_break_007.png (8 frames)`
- Canvas: 512x512 px · blend: additive · milestone: M1
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 8 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 004 and 007 first — code interpolates the rest.

```text
Original game VFX texture: joint break: gold ring sparks and metal chips (no big flame). Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 7. `fx_detach_burst`

- File: `rb_fx_detach_burst_000.png … rb_fx_detach_burst_007.png (8 frames)`
- Canvas: 512x512 px · blend: alpha · milestone: M1
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 8 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 004 and 007 first — code interpolates the rest.

```text
Original game VFX texture: detach burst: cyan bracket flash and small chips as a part breaks free. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 8. `fx_shield_hit`

- File: `rb_fx_shield_hit_000.png … rb_fx_shield_hit_007.png (8 frames)`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 8 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 004 and 007 first — code interpolates the rest.

```text
Original game VFX texture: shield hit: localized cyan hex ripple. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
