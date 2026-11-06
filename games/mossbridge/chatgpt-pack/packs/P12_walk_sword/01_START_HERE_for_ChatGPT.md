# START HERE — Mossbridge art pack P12: how Kaelrin holds his sword, and how he walks

You are the art team for "Mossbridge", an original 2D MMORPG (chibi hand-painted style, cozy high-fantasy).
Kaelrin is OUR OWN character. Never copy the sprites, characters or poses of any existing game.

## How we work in this chat
1. Read this file and look at every image in `refs/` (unzip with Python if needed and display the images to yourself).
2. Reply exactly: `Ready — waiting for STEP 1` and wait.
3. When I write `STEP 1`, `STEP 2` or `STEP 2-ALT`, open the matching file in this zip
   (`STEP1_P12A_sword_hold.txt`, `STEP2_P12B_walk8_sw.txt`, `STEP2-ALT_P12C_walk4_sw.txt`)
   and generate exactly ONE image at the SIZE it gives, using its PROMPT text word for word as the image prompt
   (do not shorten or rewrite it). Do not ask follow-up questions.
4. After each image, stop and wait. I check every image before the next step.
5. If I send a correction sentence, redraw the same image with only that change.

## Reference images (refs/)
- `REF_03_kaelrin_4_views.png` — Kaelrin in 4 camera views. View 1 (top-left) = **SW**: front three-quarter, facing down-left.
- `P01_kaelrin_body_empty_hands.png` — "my P01 image": Kaelrin full body, same 4 views (SW, SE / W, NE). His exact face, hair, armor and size.
- `P03_weapon_brass_pickblade.png` — "my P03 image": his weapon alone (steel blade with a pick hook, brass guard, leather grip, round brass pommel).
- `REF_04_sprite_atlas_style.jpg` — the painting style of our sprites.

## Global style (every image)
- Chibi hand-painted 2D game sprite, about 2.5 heads tall, big expressive eyes, chunky readable silhouette.
- Soft cel shading with subtle painterly brush texture. Colored dark outline (not black), medium thickness.
- Lighting: warm light from TOP-FRONT (above the camera, symmetric) — never from the left or right side,
  so a mirrored copy still looks right. Shadows lean purple-blue. Thin warm rim light on top edges.
- Camera: 3/4 top-down (about 45° looking down), ORTHOGRAPHIC, no perspective distortion.
- Kaelrin always looks exactly like REF_03 / P01: same face, teal spiky hair, teal leather armor with brass trim and
  shoulder pads, dark teal scarf, brown belt with pouch, armored boots.

## Rules for animation sheets (they replace "only the camera changes" from earlier packs)
1. Background = ONE flat solid magenta #FF00FF, edge to edge. No floor, no cast shadow, no gradient, no text, no labels,
   no frame numbers, no watermark, no grid lines.
2. The image is split into equal invisible cells, one frame per cell, read left to right, top to bottom.
   The character is centered in each cell with generous empty space; nothing touches or crosses a cell border.
3. Same character, same size and same camera in every cell. Feet on the same baseline. ONLY THE POSE CHANGES.
4. One action and one direction per image. No motion lines, smears, dust, glow or effects — the game draws those.

## Sword-holding rules (our current version fails exactly here)
- The sword is ALWAYS in his RIGHT hand. In view SW that is the hand on the LEFT side of the picture.
- Full grip: four fingers wrapped around the leather grip, thumb over the fingers, the brass guard directly above
  the fist and the pommel just below it. The handle disappears into the fist. Never two fingers, never floating,
  never a handle passing in front of the fingers.
- The blade continues in a straight line out of the fist. Wrist and forearm look firm, as if carrying real weight.
- The sword keeps the same size as in P03 relative to him (full length about 55% of his height) in every frame.
- Readable silhouette: the blade stays clear of his face and legs; it should read even as a solid black shape.

## Walking rules (classic 2D game walk cycle, chibi version)
- 8 frames = one full cycle: CONTACT → DOWN → PASSING → UP, then the same with the other leg.
- Arms swing opposite to the legs. The sword arm swings only a little (the weapon has weight); the free arm swings more.
- The body bobs: lowest on DOWN, highest on UP. The bob comes from the legs bending and straightening.
- Chibi proportions: short quick steps, feet lift only a little, knees clearly bend, shoulders turn slightly against
  the hips, the head stays steady and level.
- Upright posture: back straight, chest up, hips directly under the shoulders, a very slight forward lean.
  Never leaning back or pushing the hips out (that reads as "walking like his bottom hurts").
- Walk IN PLACE: the body stays in the middle of the cell, the planted foot slides back under him; nothing drifts sideways.
- Every frame is clearly different from its neighbours; no two identical frames.
