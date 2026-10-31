# BATCH_032 — Effects (10 textures)

Assets: 10 · Attach reference images: `references/vfx_concepts.jpg`, `references/fx_explosion.jpg`, `references/fx_ion.jpg`, `references/fx_plasma.jpg`, `references/fx_shield.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 10 images of BATCH_032 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `fx_explosion_large`

- File: `rb_fx_explosion_large_000.png … rb_fx_explosion_large_011.png (12 frames)`
- Canvas: 512x512 px · blend: alpha · milestone: M5
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 12 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 006 and 011 first — code interpolates the rest.

```text
Original game VFX texture: large explosion: fire, smoke, shockwave ring, debris. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 2. `fx_fusion_flare`

- File: `rb_fx_fusion_flare_000.png … rb_fx_fusion_flare_011.png (12 frames)`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 12 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 006 and 011 first — code interpolates the rest.

```text
Original game VFX texture: fusion flare: purple/cyan orbit rings converging. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 3. `fx_smoke_puff`

- File: `rb_fx_smoke_puff_000.png … rb_fx_smoke_puff_007.png (8 frames)`
- Canvas: 512x512 px · blend: alpha · milestone: M5
- Anchors / layout: pivot (256,256)
- Note: Flipbook of 8 frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames 000, 004 and 007 first — code interpolates the rest.

```text
Original game VFX texture: grey smoke puff. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 4. `fx_exhaust_noise`

- File: `rb_fx_exhaust_noise_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: cyan engine exhaust noise texture (tileable). Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 5. `fx_beam_core`

- File: `rb_fx_beam_core_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M1
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: beam core texture: horizontal tileable cyan beam with white centre. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 6. `fx_plasma_noise`

- File: `rb_fx_plasma_noise_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: violet plasma noise texture (tileable). Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 7. `fx_ion_branch`

- File: `rb_fx_ion_branch_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: thin branching cyan ion lightning. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 8. `fx_frost_shard`

- File: `rb_fx_frost_shard_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: pale-blue frost shard burst. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 9. `fx_gravity_ring`

- File: `rb_fx_gravity_ring_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: violet gravity distortion ring. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 10. `fx_shockwave_ring`

- File: `rb_fx_shockwave_ring_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M5
- Anchors / layout: pivot (256,256)

```text
Original game VFX texture: thin bright shockwave ring. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, no cropped glow at the edges. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
