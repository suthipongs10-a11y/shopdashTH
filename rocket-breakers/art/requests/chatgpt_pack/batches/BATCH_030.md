# BATCH_030 — Sector backgrounds (P08)

Assets: 3 · Attach reference images: `references/salvage_sequence.jpg`, `references/galaxy_map.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 3 images of BATCH_030 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `bg_P08_far`

- File: `rb_bg_p08_far_000.png`
- Canvas: 1536x2048 px · blend: opaque · milestone: M4
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Eclipse Citadel: obsidian artificial fortress planet with gold lines and eclipse rim light. FAR layer: deep space backdrop, nebula and distant planet, very low contrast and saturation so bullets stay readable. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: fully opaque painted image that fills the whole canvas edge to edge.
```

## 2. `bg_P08_mid`

- File: `rb_bg_p08_mid_000.png`
- Canvas: 1536x2048 px · blend: alpha · milestone: M4
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Eclipse Citadel: obsidian artificial fortress planet with gold lines and eclipse rim light. MID layer: mid-distance silhouettes and structures, low contrast, mostly transparent. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge. This is a parallax overlay layer: only foreground elements, the rest fully transparent.
```

## 3. `bg_P08_foreground`

- File: `rb_bg_p08_foreground_000.png`
- Canvas: 1536x2048 px · blend: alpha · milestone: M4
- Anchors / layout: full canvas; seamless top/bottom

```text
Original vertical-scrolling shoot-em-up background, portrait 1536x2048: Eclipse Citadel: obsidian artificial fortress planet with gold lines and eclipse rim light. FOREGROUND layer: a few close debris pieces near the left and right edges only, centre clear. Top edge and bottom edge must tile seamlessly when stacked vertically. No ships, no characters, no bullets, no text, no UI. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge. This is a parallax overlay layer: only foreground elements, the rest fully transparent.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
