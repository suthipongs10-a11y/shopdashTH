# CLAUDE.md — ROCKET BREAKERS

This folder is a **separate game project** that lives inside the ShopDash repo.
The repo-root `CLAUDE.md` (ShopDash SaaS rules, phases, stack) does **not** apply here.

Single source of truth is `AGENTS.md` in this folder — do not duplicate the spec here.
Read in this order before implementing anything:

1. `AGENTS.md` — product intent and working rules
2. `docs/SYSTEMS.md` — formulas and state rules
3. `data/catalog.json` + `docs/CONTENT_CATALOG.md` — IDs and content values (from handoff ZIP 02)
4. `docs/TECHNICAL.md` — code contracts, saves, tests
5. `docs/ART_BIBLE.md` + `art/concepts/` — art spec and references
6. `docs/PRODUCTION.md` + `art/requests/BATCH_###.md` — milestones M0–M6
7. `expansion_01/POWERUPS_AND_SPECTACLE.md` + `data/powerups.json` — power-ups and VFX (additive spec)

Run/test: `npm install`, `npm test`, `npm run build` (web build — Godot was dropped, see DECISIONS).
Session cadence: start by reading `PROGRESS.md` and `NEXT_ACTIONS.md`; end by updating both.
Log any spec conflict or implementation decision in `docs/DECISIONS.md`.
Final raster art comes from ChatGPT via the owner — write request packs to `art/requests/`,
drop returned files in `art/incoming/` until they pass ART_BIBLE review gates.
