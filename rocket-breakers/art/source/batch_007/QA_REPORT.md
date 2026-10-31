# BATCH_007 QA — Weapon HUD icons + emitter glows (6/6 delivered in 3 parts)

| Asset | SHA-256 | Alpha / blend | Runtime | Status / use |
|---|---|---|---|---|
| weapon_W001_icon | match | clean on dark/white/checker | 128×121 | integrated: HUD heat row, dock card |
| weapon_W008_icon | match | clean | 100×128 | integrated: HUD heat row, dock card |
| weapon_W022_icon | match | clean | 115×128 | integrated: HUD heat row, dock card |
| weapon_W001_glow | match | additive, soft alpha, bright core at requested emitter (0.50, 0.17) | 119×128 | integrated: muzzle flash, 34 px, 0.07 s |
| weapon_W008_glow | match | additive | 128×120 | integrated: beam emitter flash, 42 px |
| weapon_W022_glow | match | additive | 128×100 | integrated: plasma emitter flash, 54 px |

Icons are a 3/4 view (fine for icons; in-world modules still use the BATCH_001 top-down sprites).
Sources 1254×1254 (requested 512); premultiplied downscale only. Verified in Chromium: glows appear at the
muzzles in rapid frames, dock card icon readable, no console errors.
