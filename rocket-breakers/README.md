# ROCKET BREAKERS — web build

**Play (private link):** https://claude.ai/artifact/KhZtTSBTb3Zq8piUboUu8S — open on a phone or PC browser.

Stack: TypeScript + Vite, HTML5 Canvas 2D, Web Audio, localStorage saves. No game engine install needed.
The build is one self-contained `index.html` (fonts, data, textures inlined).
Design spec: `AGENTS.md` + `docs/` + `expansion_01/`. Status: `PROGRESS.md`; next steps: `NEXT_ACTIONS.md`.

## Controls

Touch: drag anywhere to fly (relative) · tap an enemy/weak point to lock · buttons: Dash, Drive (Overdrive),
Tractor (appears when a part is in range; hold it) · II = pause. Guns auto-fire.
Keyboard: WASD/arrows · Space dash · R Overdrive · E tractor (hold) / release (tap twice) · F cycle target · Esc pause.
Gamepad: left stick · A dash · Y Overdrive · RB tractor · LB cycle target · Start pause.

## Develop

```bash
cd rocket-breakers
npm install
npm run dev          # http://localhost:5173 (also reachable from a phone on the same Wi-Fi via --host)
npm test             # 54 behaviour tests (vitest), incl. a bot that plays the full salvage loop
npm run build        # typecheck + dist/index.html (single file)
npm run validate     # python design-data validator from the handoff
node scripts/make-artifact.mjs dist/index.html out.html   # artifact-page variant
node e2e/capture.mjs http://localhost:4173/ ./captures    # dev screenshots in Chromium (after `npm run preview`)
```

## Layout

| Path | Purpose |
|---|---|
| `src/core` | catalog loader/validator, i18n (th/en), asset resolver, fixed 60 Hz clock, RNG, swept geometry |
| `src/ships` | movement/dash, 7×7 attachment-grid assembly (mask, mass, reactor connectivity, muzzles) |
| `src/combat` | world tick, weapons (energy/heat), bullets, enemy part model, E01/E03, B02 boss, attack primitives, power-ups |
| `src/salvage` | salvage state machine (allowed transitions, idempotent tx ids) |
| `src/campaign` | reward settlement journal (exactly-once) |
| `src/save` | profile schema, save repository (checksum, backups, migration, future-save block, export/import) |
| `src/ui`, `src/audio` | canvas renderer, HUD, menus, dock fitting panel, synthesized prototype SFX |
| `data/` | `catalog.json` (source of truth), `powerups.json`, `i18n/ui.json` |
| `assets/` | Noto Sans Thai (OFL), runtime-sized VFX copies |
| `art/`, `expansion_01/` | concepts, manifests, ChatGPT request batches, original VFX sources |
