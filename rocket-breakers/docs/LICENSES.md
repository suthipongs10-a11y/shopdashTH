# License & provenance ledger

| Item | Source | License / status |
|---|---|---|
| Runtime code | this project | project code |
| Vite, Vitest, TypeScript, vite-plugin-singlefile | npm (dev only, pinned in package.json) | MIT / Apache-2.0 (build tools; not shipped except the inlining output) |
| Noto Sans Thai (`assets/fonts/*.woff2`) | npm `@fontsource/noto-sans-thai@5.1.1`, The Noto Project Authors | SIL OFL 1.1 — `assets/fonts/OFL.txt` |
| Concept boards (`art/concepts/*.png`, `expansion_01/art/*_board.png`, `gameplay_powerup.png`) | ChatGPT imagegen via owner | reference only, `generated_unchecked` |
| VFX sources (`expansion_01/art/fx_*.png`) | ChatGPT imagegen via owner | `generated_unchecked`; runtime copies `assets/fx/*_256.png` are non-generative premultiplied downscales/crops |
| Placeholder ships/enemies/boss/icons | procedural canvas drawing in code | marked "placeholder" on screen |
| Sound effects | synthesized at runtime (Web Audio) | prototype audio, labelled; final audio needs original/licensed sources |
