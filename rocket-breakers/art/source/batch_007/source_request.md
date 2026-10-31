# BATCH_007 — Weapon HUD icons for the starter guns + stolen tail

Assets: 6 · Attach reference images: `references/modular_ships.jpg`

Paste to ChatGPT (after 00_START_HERE was sent in this chat):

> Please create the 6 images of BATCH_007 below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. Use the attached references for style only.

## 1. `weapon_W001_icon`

- File: `rb_weapon_w001_icon_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M2
- Anchors / layout: centred, pivot (256,256)

```text
Original game HUD icon for the weapon 'Needle Cannon': simplified bold front-three-quarter rendering of the module (brass/gold kinetic barrel, gold-white muzzle accent). Readable at 32 px, strong silhouette, no text, no frame. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 2. `weapon_W008_icon`

- File: `rb_weapon_w008_icon_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M2
- Anchors / layout: centred, pivot (256,256)

```text
Original game HUD icon for the weapon 'Pulse Laser': simplified bold front-three-quarter rendering of the module (slim emitter with a cyan lens (beam weapon, cyan core / white centre)). Readable at 32 px, strong silhouette, no text, no frame. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 3. `weapon_W022_icon`

- File: `rb_weapon_w022_icon_000.png`
- Canvas: 512x512 px · blend: alpha · milestone: M2
- Anchors / layout: centred, pivot (256,256)

```text
Original game HUD icon for the weapon 'Scorpion Tail': simplified bold front-three-quarter rendering of the module (violet plasma emitter bulb with purple glow). Keep the stolen boss-part look. Readable at 32 px, strong silhouette, no text, no frame. Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge.
```

## 4. `weapon_W001_glow`

- File: `rb_weapon_w001_glow_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M4
- Anchors / layout: glow centred at muzzle (256,87)

```text
Additive muzzle/emitter glow for the weapon 'Needle Cannon': only the light of its emitter (brass/gold kinetic barrel, gold-white muzzle accent), positioned where the muzzle is on the weapon sprite (top centre). No weapon body. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 5. `weapon_W008_glow`

- File: `rb_weapon_w008_glow_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M4
- Anchors / layout: glow centred at muzzle (256,87)

```text
Additive muzzle/emitter glow for the weapon 'Pulse Laser': only the light of its emitter (slim emitter with a cyan lens (beam weapon, cyan core / white centre)), positioned where the muzzle is on the weapon sprite (top centre). No weapon body. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## 6. `weapon_W022_glow`

- File: `rb_weapon_w022_glow_000.png`
- Canvas: 512x512 px · blend: additive · milestone: M4
- Anchors / layout: glow centred at muzzle (256,87)

```text
Additive muzzle/emitter glow for the weapon 'Scorpion Tail': only the light of its emitter (violet plasma emitter bulb with purple glow), positioned where the muzzle is on the weapon sprite (top centre). No weapon body. Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene.
```

## Acceptance (Claude checks on return)

Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.
