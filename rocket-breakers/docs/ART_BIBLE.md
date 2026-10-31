# Art bible and image handoff

## Direction

Premium original 2.5D rendered sprites: readable machined shapes, ceramic/steel materials, restrained surface wear, bright energy cores. No pixel art and no existing franchise silhouettes. Top-down orthographic gameplay camera, slight material bevel depth; nose up (negative image Y). Light from upper left consistently; don't bake long directional floor shadows into sprites flying over space.

Player: ivory/charcoal/orange, cyan core/exhaust. Hostiles: graphite with red/magenta telegraphs. Neutral salvage: amber outline + wrench icon; intact signature salvage: cyan bracket + unique part shape. Color is never the sole indicator. Weak joints use broken-ring target icon; armor uses closed shield icon. Preserve source-part signature accent when captured, add small cyan player ownership light.

Each sector has foreground/mid/background layers: P01 navy/teal wrecks; P02 charcoal/lava amber; P03 blue/white ion storm; P04 dark green/acid jade; P05 indigo/ice cyan; P06 burnt ochre/brass sand; P07 violet/black lensing; P08 obsidian/gold artificial fortress. Background contrast/saturation below combat actors; red bullets remain legible above all themes.

## Supplied concepts and authority

- `art/concepts/salvage_sequence.png`: break joint → tow → equip storytelling; weapon scale is illustrative, not a collider/fit specification.
- `art/concepts/modular_ships.png`: six hull visual directions; weapons shown attached are illustrative loadouts, not inseparable base hull artwork.
- `art/concepts/galaxy_map.png`: theme and screen hierarchy; branching decorative paths do not change sequential campaign unlock rules. Concept may show fewer illustrative nodes; runtime must render six mission nodes per sector from data.
- `art/concepts/vfx_concepts.png`: eight effect-family references. Black background is presentation for this board; do not import as a finished additive atlas or animation.

All four are raster concepts generated in this task. They are not animation sheets, validated transparent sprites, exact UI templates or proof of a completed game. Use these as references to generate isolated production parts. Do not cut a concept screenshot into the game's final HUD/background/ships.

## Asset delivery contracts

| Asset | Source canvas | Runtime guide | Anchor / transparency |
|---|---|---|---|
| Player hull | 1024×1024 per state/frame | base hull 58–110 logical px | reactor coordinate fixed, RGBA transparent |
| Modular weapon | 512×512 isolated | fit to 22px grid cells | attachment socket + muzzle coordinates in sidecar |
| Drone | 512×512 | 18–32px | center/core, transparent |
| Ordinary enemy | 512×512 or1024² | 35–120px | center plus joint anchors |
| Boss core/segment | 1024² per separated part | boss assembly up to600px | anchor manifest per component |
| Planet/map body | 1024² | map viewport dependent | center, no baked UI/text |
| Background layer | 1536×2048 or approved tile | sliced/imported to memory budget | no text/actors, opaque or layer alpha |
| HUD icon | 512² | min32px icon target | center, transparent, no baked label |
| Explosion/impact source | 512² per frame | scale24–220px | fixed center and frame extents |
| FX texture | 512² | procedural scale | alpha or additive recipe explicitly noted |

These are target delivery dimensions, not assumed imagegen guarantees. If returned dimensions differ, validate aspect ratio, padding and details before documented resampling. Preserve original source. Asset registration and exact motion require production QA; never trust a generated sheet merely because its labels say frame1..8.

Output naming: `rb_<category>_<id>_<state>_<frame>.png`, lower snake case. Sidecars JSON: asset_id, source_filename, canvas_size, trim_rect, pivot_px, attachment_anchors, muzzles, collider_hint, frame_index, frame_duration_ms, blend_mode, color_space, provenance, status. Do not put baked collider polygons in visible art. Logical collider authored separately and reviewed over the sprite.

Hull states: neutral, lean_left, lean_right, damaged overlay (separate), engine glow (separate). Lean art never changes sockets/colliders. For starter prototype, one neutral frame + code banking is sufficient; final lean frames are authored to same anchor. Boss parts: base, weak_joint, damage_overlay and detached shape must align to the same joint pivot. Ship/boss core surfaces must not contain attached guns that need to be detachable.

VFX direction: kinetics = gold/white sparks; player beam = cyan core white center; plasma = purple bulb/trail; ion = thin branching cyan; thermal = orange ribbons and dark cooling embers; cryo = pale-blue shards; gravity = violet ring distortion with low amplitude. Hostile danger rendered in red/magenta high-contrast layer regardless of element. Provide friendly/hostile material tint variants to prevent ambiguous purple player plasma.

Alpha textures store visible color with correct edge dilation; test on black, white and checkerboard. Additive textures may intentionally have black background but must be marked `additive`, never imported as opaque sprite. Black-background energy art requires a documented shader/composite, not careless background deletion that destroys glow. Prefer transparent body art with separate additive glow texture.

Flipbooks: explosion12frames/0.45sec; spark8/0.18sec; shield hit8/0.25sec; detach burst8/0.3sec; fusion flare12/0.6sec. Start/end empty with no cropped glow, fixed pivot, no camera changes. More frames only if measured visual need; trails, laser lengths, chains and cable movement are procedural. ChatGPT supplies texture motifs and key frames, Claude creates temporal particles and runtime interpolation. Do not promise generated frames have optical-flow consistency without inspection.

## Review gates

1. ID exists and matches requested object. Correct orientation/material/color; no unrelated extra parts.
2. Silhouette remains identifiable at actual on-phone size. Clean edge/padding; no clipped wings/glow.
3. RGBA transparency verified, no checkerboard baked in. Correct black/white compositing. No watermark/text in production sprites.
4. All frame anchors/registers stable; attachment sockets and muzzle coordinates tested in engine.
5. Boss stolen component is recognizable before/after theft. Captured version is normalized to player footprint and damage spec.
6. Required files and dimensions match manifest; original preserved; atlas extraction manual/documented if needed.
7. License/provenance ledger filled; original-looking imagery is not legal clearance.

Claude must return failed assets with a screenshot overlay and precise corrections; avoid asking ChatGPT to regenerate an entire successful batch for one anchor mismatch that can be fixed deterministically.

## Batch protocol and asset status

States: planned → requested → generated_unchecked → approved → integrated → retired. Temporary placeholder is a separate status. Initial manifest production rows are `planned`; concept rows are `generated_unchecked` until owner visual approval. No production sprites are claimed delivered in this pack.

Each request batch: at most 8–12 closely related source assets, one approved reference first for a new family, then remaining states/modules. Owner already requests ChatGPT to create all final images; request packs are production coordination, not a requirement for repeated generic permission questions. Stop only for missing required reference or an explicit scope/budget decision.

Final sound/music is not an image artifact. Create an audio cue ledger: shot families, joint break, tractor acquire/cable strain, salvage secure, heat lock, dash, Overdrive, hit, boss telegraph, stage ambience/music. Prototype synthesized sounds must be labeled. License all final sounds and fonts for intended distribution.
