# Sprite asset job: start here (version 2, dark fantasy)

You are producing 2D sprite assets for an action RPG. Everything you need is in this pack.
The person talking to you is the game's owner. They will download each image you make and pass it
to the game's developer, who slices and aligns the sheets. Work in the order below.

## How to work

1. Generate ONE asset at a time, in the order of the table. Use the full text of that asset's prompt
   file in `prompts/` as the image prompt. Do not shorten or paraphrase it.
2. Use the reference images named in the prompt file's `ATTACH WITH THIS PROMPT` line:
   the layout templates in `templates/`, and the character's concept image once it is approved.
3. After each image, state the output file name and wait. Continue only when the owner says "next".
   If the owner asks for a fix, regenerate that same asset.
4. Keep every character identical to its approved concept image in all later sheets.
5. If a prompt file and this file disagree, the prompt file wins.

## Order

| # | Prompt file | Output file name | Reference images |
|---|---|---|---|
| 1 | `prompts/10_warden_concept.txt` | `warden_concept.png` | `template_turnaround.png` |
| 2 | `prompts/11_warden_idle.txt` | `warden_idle.png` | `warden_concept.png`, `template_sheet_5x4.png` |
| 3 | `prompts/12_warden_walk.txt` | `warden_walk.png` | `warden_concept.png`, `template_sheet_5x4.png` |
| 4 | `prompts/13_warden_attack.txt` | `warden_attack.png` | `warden_concept.png`, `template_sheet_5x4.png` |
| 5 | `prompts/20_golem_concept.txt` | `golem_concept.png` | `template_turnaround.png` |
| 6 | `prompts/21_golem_walk.txt` | `golem_walk.png` | `golem_concept.png`, `template_sheet_5x4.png` |
| 7 | `prompts/22_golem_attack.txt` | `golem_attack.png` | `golem_concept.png`, `template_sheet_5x4.png` |
| 8 | `prompts/30_imp_concept.txt` | `imp_concept.png` | `template_turnaround.png` |
| 9 | `prompts/31_imp_walk.txt` | `imp_walk.png` | `imp_concept.png`, `template_sheet_5x4.png` |
| 10 | `prompts/32_imp_attack.txt` | `imp_attack.png` | `imp_concept.png`, `template_sheet_5x4.png` |
| 11 | `prompts/40_fx_lion_spirit.txt` | `lion_spirit.png` | none |
| 12 | `prompts/50_icons_skills.txt` | `icons_skills.png` | `warden_concept.png` |

## Art direction

Dark high fantasy, mysterious and powerful. Heroic semi-realistic proportions (about 5 heads tall),
never cute or chibi. Every prompt file repeats the full style block; follow it exactly.

## Rules that apply to every sprite sheet

- The templates show layout only. Never reproduce their grid lines, labels, arrows, ovals or white background.
- Transparent background. If you cannot produce transparency, use flat pure green `#00FF00`.
- No ground shadows, no effects (trails, glows, sparks), no text, no borders, no watermark.
- Same character size and the same foot baseline in every cell. Nothing crosses a cell boundary.
- PNG output at the largest resolution available for the requested aspect ratio.

## If a 20-pose sheet comes out inconsistent

Tell the owner, then split that sheet into five images, one per direction row. Each image is a
landscape 3:2 canvas with a single row of the 4 frames, using the same prompt text but only the
one row. Name them with a row suffix, for example `warden_walk_row1.png` to `warden_walk_row5.png`
(row 1 FRONT, row 2 FRONT-LEFT, row 3 LEFT, row 4 BACK-LEFT, row 5 BACK).

## Do not

- Do not copy characters, names or art from any existing game. These designs are original.
- Do not resize, crop, upscale or convert the results to JPG.
- Do not write code or slice the sheets. The developer does that.
