"""Build the ChatGPT image-request pack for ROCKET BREAKERS.

Usage (from rocket-breakers/):
    python3 tools/build_art_pack.py                       # markdown pack -> art/requests/chatgpt_pack/
    python3 tools/build_art_pack.py --zip OUT.zip         # also zip it with downscaled reference images

Every row of art/asset_manifest.csv (except the 4 concept boards) plus the 12 expansion
pickup icons becomes one image request with an exact file name, canvas, background rule,
anchors and a ready-to-paste English prompt built from data/catalog.json. Batches hold
at most 12 closely related assets, in production priority order (ART_BIBLE batch protocol).
Needs Pillow only for --zip (reference images).
"""
import argparse
import csv
import json
import shutil
import zipfile
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "art/requests/chatgpt_pack"
CAT = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
PU = json.loads((ROOT / "data/powerups.json").read_text(encoding="utf-8"))
MANIFEST = list(csv.DictReader((ROOT / "art/asset_manifest.csv").open(encoding="utf-8")))
IDX = {g: {r["id"]: r for r in CAT[g]} for g in ["hulls", "weapons", "utilities", "abilities", "fusions", "enemies", "bosses", "hazards", "sectors"]}

STYLE = (
    "Original ROCKET BREAKERS game art. Premium 2.5D rendered sprite, strict top-down orthographic camera, "
    "nose/front pointing UP (top of image), consistent light from the upper-left, machined ceramic and steel "
    "materials with restrained wear, chunky readable silhouette that still reads at small phone size. "
    "NOT pixel art, no text, no letters, no logos, no watermark, no UI frame, no floor or cast shadow, no scene."
)
PLAYER = "Player palette: ivory and charcoal plates with orange accents, cyan energy core and cyan ownership lights."
HOSTILE = "Hostile palette: dark graphite armour with red and magenta warning lights and telegraph accents."
ALPHA = "Background: real transparent alpha (PNG with alpha channel). Do NOT paint a checkerboard. Generous empty padding around the object; nothing touches the canvas edge."
ADDITIVE = "Background: glow-only additive texture. Preferred: transparent alpha with soft feathered glow. If transparency is impossible, use a PURE BLACK (#000000) background and say so — never grey, never a scene."
OPAQUE = "Background: fully opaque painted image that fills the whole canvas edge to edge."

FAMILY = {
    "kinetic": "brass/gold kinetic barrel, gold-white muzzle accent",
    "beam": "slim emitter with a cyan lens (beam weapon, cyan core / white centre)",
    "missile": "missile rack with orange-tipped warheads",
    "plasma": "violet plasma emitter bulb with purple glow",
    "electric": "ion coils with thin branching cyan lightning motifs",
    "thermal": "heat vents and orange-glowing nozzles with dark cooling fins",
    "cryo": "pale-blue frost crystal emitter",
    "gravity": "violet gravity ring emitter with subtle lensing",
    "drone": "small drone bay / cradle with docked mini drone",
    "melee": "heavy mechanical close-range tool head",
    "tractor": "grabbing claw tool with cyan tractor emitter",
}
HULL_SHAPE = {
    "H01": "SPARROW starter fighter: compact balanced body, swept wings, twin engines, cyan canopy (see modular_ships reference, top-left ship)",
    "H02": "KESTREL interceptor: slim fast body, long sharp swept wings, narrow nose, very little carrying space",
    "H03": "BASTION armour ship: wide heavy frame, broad front gun deck, thick layered plating",
    "H04": "MAGPIE salvage hauler: cargo clamps, rear tow hardpoints, two ring engines",
    "H05": "HIVE drone carrier: round central hub with empty docking cradles for small drones",
    "H06": "CHIMERA mixed-weapon frame: long body with many varied empty hardpoints",
    "H07": "LANCER recoil fighter: long spear-like body with a reinforced spine and braced wings",
    "H08": "MIRAGE decoy fighter: sleek stealthy body with holographic emitter fins",
    "H09": "ANCHOR gravity-stable ship: heavy squat frame with two stabiliser rings",
    "H10": "BULWARK shield ship: frontal shield-projector arcs, sturdy body",
    "H11": "COMET heat specialist: big radiator fins and heat sinks with faint orange glow",
    "H12": "RELIQUARY hybrid: player ivory frame rebuilt around recovered graphite boss plates",
}
SECTOR_LOOK = {
    "P01": "Graveyard Belt: navy and teal space full of drifting shipwrecks and broken hull plates",
    "P02": "Cinder Foundry: charcoal industrial planet with lava-amber molten channels and furnaces",
    "P03": "Tempest Reach: blue-white ion storm clouds with distant lightning",
    "P04": "Verdant Machine: dark green machine jungle with acid-jade glowing roots over metal",
    "P05": "Frostglass: indigo moon with ice-cyan crystal spires and frozen shards",
    "P06": "Dune Extraction: burnt ochre desert mining planet with brass rigs and sand haze",
    "P07": "Gravity Scar: violet-black rift with gravitational lensing and bent light",
    "P08": "Eclipse Citadel: obsidian artificial fortress planet with gold lines and eclipse rim light",
}
BOSS_LOOK = {
    "B01": ("Rivet Crab", "armoured scrap crab", "front grabbing claw (left claw)"),
    "B02": ("Scorpion Reclaimer", "mechanical scorpion: torso and legs", "segmented plasma tail with violet emitter stinger"),
    "B03": ("Furnace Ram", "armoured battering-ram furnace machine", "glowing ram head with flame nozzles"),
    "B04": ("Forge Centipede", "industrial rail-crawler centipede (NOT a worm battleship)", "back-mounted magma mortar"),
    "B05": ("Kite Sentinel", "kite-shaped floating sentinel", "pair of mirror wings"),
    "B06": ("Storm Ray", "manta-ray war machine", "lightning wing (one wing with ion coils)"),
    "B07": ("Thorn Mantis", "praying-mantis machine with thorny plates", "scythe arm"),
    "B08": ("Root Cathedral", "cathedral-like root-covered machine", "drone nest pod"),
    "B09": ("Prism Stag", "crystal stag machine", "prism antlers"),
    "B10": ("Glacier Leviathan", "ice leviathan (whale/serpent) machine", "freezing harpoon launcher"),
    "B11": ("Bore Mole", "burrowing mole machine", "drill head"),
    "B12": ("Sand Bastion", "mobile desert fortress", "siege rail cannon"),
    "B13": ("Orbit Warden", "orbital ring-station guardian", "rotating blade ring"),
    "B14": ("Singularity Serpent", "gravity serpent machine", "gravity fang jaw"),
    "B15": ("Mirror Admiral", "admiral flagship", "pair of reflector wings"),
    "B16": ("Iron Devourer", "final boss: segmented battleship worm (head segment for the core image)", "spinal cannon segment"),
}
ENEMY_SHAPE = {
    "scout": "small arrowhead drone", "interceptor": "fast swept-wing needle fighter", "shield": "boxy barge with a frontal shield plate and one exposed rear-side joint",
    "cargo": "fuel hauler with big tanks and exposed engine joint", "minelayer": "skiff with a mine rack", "cutter": "slim ship with a long red blade arm (cable cutter)",
    "bomber": "wide bomber with ash-bomb bays", "thermal": "furnace drone with flame nozzle", "ion": "skater with ion coils", "turret": "stationary storm pylon turret",
    "healer": "backline healer with green repair tether emitter (root shapes)", "swarm": "tiny thorn-shaped swarm drone", "beam": "stationary prism sentry with a beam lens",
    "charger": "ice diver with ram nose", "drill": "drill diver with drill nose", "artillery": "sand mortar artillery platform", "gravity": "gravity anchor with violet ring field emitter",
    "orbiter": "orbit guard with circling blade pods", "decoy": "mirror decoy with reflective panels", "elite": "heavy citadel guard elite gunship",
    "salvage_thief": "loot snatcher with a tractor claw", "missile": "missile frigate with launch tubes", "carrier": "armour carrier with a scout launch bay",
}
UI_DESC = {
    "ui_dash": "dash icon: chevron arrows with motion streak", "ui_overdrive": "overdrive icon: turbine/engine surge emblem", "ui_tractor": "tractor icon: magnet beam pulling a part",
    "ui_lock_joint": "weak-joint target icon: BROKEN ring with three gaps around a dot (amber)", "ui_locked_armor": "armour icon: CLOSED shield", "ui_star_full": "filled gold star",
    "ui_star_empty": "empty star outline", "ui_credits": "credit coin chip", "ui_scrap": "pile of scrap bolts and nuts", "ui_blueprint": "blueprint fragment sheet with cyan lines",
    "ui_heat": "heat thermometer with flame", "ui_energy": "energy bolt in a cell", "ui_cargo": "cargo crate with tow hook", "ui_repair": "wrench and cross repair icon",
    "ui_settings": "gear", "ui_pause": "pause bars", "ui_play": "play triangle", "ui_hangar": "hangar door with ship silhouette", "ui_galaxy": "planet with orbit ring",
    "ui_codex": "open data book", "ui_fusion_core": "violet fusion core orb in rings", "ui_extraction": "extraction gate / warp ring with arrow",
}
FX_DESC = {
    "fx_explosion_small": "small ship explosion: bright core, orange fire, small metal debris", "fx_explosion_large": "large explosion: fire, smoke, shockwave ring, debris",
    "fx_impact_spark": "kinetic impact: gold-white sparks burst", "fx_joint_break": "joint break: gold ring sparks and metal chips (no big flame)",
    "fx_shield_hit": "shield hit: localized cyan hex ripple", "fx_detach_burst": "detach burst: cyan bracket flash and small chips as a part breaks free",
    "fx_fusion_flare": "fusion flare: purple/cyan orbit rings converging", "fx_smoke_puff": "grey smoke puff", "fx_exhaust_noise": "cyan engine exhaust noise texture (tileable)",
    "fx_beam_core": "beam core texture: horizontal tileable cyan beam with white centre", "fx_plasma_noise": "violet plasma noise texture (tileable)",
    "fx_ion_branch": "thin branching cyan ion lightning", "fx_frost_shard": "pale-blue frost shard burst", "fx_gravity_ring": "violet gravity distortion ring",
    "fx_tractor_mote": "one cyan soft energy streak/mote with bright core (repeated along a tow cable)", "fx_shockwave_ring": "thin bright shockwave ring",
}


def bg_rule(blend, category):
    if category == "background":
        return OPAQUE if blend == "opaque" else ALPHA + " This is a parallax overlay layer: only foreground elements, the rest fully transparent."
    return ADDITIVE if blend == "additive" else ALPHA


def entry(asset_id, category, canvas, frames, blend, milestone, prompt, anchors, notes=""):
    stem = asset_id.lower()
    files = [f"rb_{stem}_{i:03d}.png" for i in range(int(frames))]
    return {"id": asset_id, "category": category, "canvas": canvas, "frames": int(frames), "blend": blend, "milestone": milestone,
            "files": files, "prompt": prompt, "anchors": anchors, "notes": notes}


def describe(row):
    aid, cat, size, frames, blend, ms = row["asset_id"], row["category"], row["source_size"], row["frame_count"], row["blend_mode"], row["milestone"]
    w, h = (int(x) for x in size.split("x"))
    c = f"{w}x{h}"
    if cat == "hull":
        hid = aid.split("_")[1]
        state = aid[len(f"hull_{hid}"):].strip("_") or "neutral"
        shape = HULL_SHAPE[hid]
        anchors = f"reactor/core centre at ({w//2},{int(h*0.547)}); nose near y={int(h*0.17)}; hull inside x {int(w*0.2)}..{int(w*0.8)}, y {int(h*0.16)}..{int(h*0.84)}"
        if state == "neutral":
            p = f"{STYLE} {PLAYER} Spaceship hull: {shape}. BARE hull only: no guns, no missiles, no engine flame (weapons are separate modules)."
        elif state in ("lean_left", "lean_right"):
            side = "left" if state == "lean_left" else "right"
            p = f"{STYLE} {PLAYER} Same {hid} hull as the neutral image, banking slightly to the {side} (about 15 degrees roll, wing on that side lower and foreshortened). Identical size, position and reactor point as the neutral image; bare hull, no guns, no flame."
        elif state == "damage_overlay":
            p = f"{STYLE} Damage overlay for the {hid} hull: ONLY scorch marks, cracks, exposed wiring and small sparks laid out exactly over the hull silhouette of the neutral image; everything else transparent. No hull body painted."
        else:
            p = f"{STYLE} Engine glow overlay for the {hid} hull: ONLY the cyan engine light/plume coming out of the engine nozzles of the neutral image, soft feathered glow, no ship body."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", anchors, "Same canvas, scale and reactor point across all 5 states of this hull.")
    if cat in ("weapon", "icon", "weapon_glow"):
        wid = aid.split("_")[1]
        wr = IDX["weapons"][wid]
        cells = wr["footprint"]
        shape = {1: "small single-cell module (square-ish)", 2: "slim module two cells tall (2:1 tall)", 3: "three-cell module", 4: "big 2x2 block module"}.get(len(cells), "module")
        fam = FAMILY.get(wr["family"], wr["family"])
        sig = ""
        if wr["salvage_source"]:
            name, body, part = BOSS_LOOK[wr["salvage_source"]]
            sig = (f" This is the player-normalized STOLEN version of the {name}'s {part}: keep the boss part's recognizable shape and accent colour, "
                   f"graphite boss plates, plus one small cyan player ownership light. Compact, not the giant boss-size part.")
        if cat == "weapon":
            p = f"{STYLE} Detachable ship weapon module '{wr['name']['en']}' ({wr['attack_model']} attack): {fam}; {shape}.{sig} Muzzle at the top, flat attachment socket at the bottom centre. No muzzle flash, no projectile."
            anchors = f"muzzle ({w//2},{int(h*0.17)}); attachment socket ({w//2},{int(h*0.82)}); object inside {int(w*0.16)}..{int(w*0.84)}"
        elif cat == "icon":
            p = f"Original game HUD icon for the weapon '{wr['name']['en']}': simplified bold front-three-quarter rendering of the module ({fam}).{sig and ' Keep the stolen boss-part look.'} Readable at 32 px, strong silhouette, no text, no frame."
            anchors = f"centred, pivot ({w//2},{h//2})"
        else:
            p = f"Additive muzzle/emitter glow for the weapon '{wr['name']['en']}': only the light of its emitter ({fam}), positioned where the muzzle is on the weapon sprite (top centre). No weapon body."
            anchors = f"glow centred at muzzle ({w//2},{int(h*0.17)})"
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", anchors)
    if cat == "utility":
        u = IDX["utilities"][aid.split("_")[1]]
        p = f"{STYLE} {PLAYER} Small ship utility module '{u['name']['en']}' (effect: {u['effect']}). Single grid cell, compact device, attachment socket at the bottom centre."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"socket ({w//2},{int(h*0.8)}); centred")
    if cat == "ability":
        a = IDX["abilities"][aid.split("_")[1]]
        boss = BOSS_LOOK[a["unlock_source"]][0]
        p = f"Original game ability icon '{a['name']['en']}' (an active power learned from the boss {boss}). Visual idea: {a['behavior']}. Bold emblem, readable at 32 px, no text."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"centred, pivot ({w//2},{h//2})")
    if cat == "fusion":
        f = IDX["fusions"][aid.split("_")[1]]
        nm = f["name"] if isinstance(f["name"], str) else f["name"]["en"]
        p = f"Original game fusion-weapon icon '{nm}': fusion of {f['host_family']} host with {f['catalyst_family']} catalyst ({f['attack_model']}). Glowing combined energy emblem, purple/cyan fusion rings, no text."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"centred, pivot ({w//2},{h//2})")
    if cat == "enemy":
        e = IDX["enemies"][aid.split("_")[1]]
        p = (f"{STYLE} {HOSTILE} Enemy ship '{e['name']['en']}' (role {e['role']}): {ENEMY_SHAPE.get(e['role'], e['role'])}. "
             f"Moves '{e['movement']}', attacks with '{e['attack_model']}'. Shape must predict its behaviour; distinct silhouette from other enemies. Draw it nose UP like every sprite in this game (the engine rotates it to face the player).")
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"centre ({w//2},{h//2}); mark nothing — joints are authored in code")
    if cat == "boss_part":
        _, bid, *rest = aid.split("_")
        kind = "_".join(rest)
        b = IDX["bosses"][bid]
        name, body, part = BOSS_LOOK[bid]
        sector = SECTOR_LOOK[b["sector_id"]].split(":")[0]
        common = f"{STYLE} {HOSTILE} Boss {name} from {sector}."
        prompts = {
            "core": f"{common} Main body: {body}. Do NOT include the detachable {part} — leave a clear mechanical socket where it attaches. Body only.",
            "armor": f"{common} Armour plate that closes over the {part} joint: thick curved graphite plate with a CLOSED shield look, separate object.",
            "joint": f"{common} Circular hinge coupling that links the {part} to the body: machined metal outer ring and a glowing AMBER inner ring (weak point). Separate object, no surrounding body.",
            "signature_mount": f"{common} The detachable {part}, isolated, at boss scale, exactly as it looks when attached (its socket end at the bottom of the image). This is the part players shoot off and steal.",
            "damage_overlay": f"{common} Damage overlay for the boss body: ONLY cracks, scorch, exposed glowing wiring and sparks laid over the core silhouette; everything else transparent.",
        }
        anchors = {"core": f"core centre ({w//2},{h//2}); leave socket for the {part}", "joint": f"pivot ({w//2},{h//2})",
                   "armor": f"pivot ({w//2},{h//2}) = joint centre", "signature_mount": f"socket end at ({w//2},{int(h*0.85)})", "damage_overlay": "same framing as core"}[kind]
        return entry(aid, cat, c, frames, blend, ms, f"{prompts[kind]} {bg_rule(blend, cat)}", anchors,
                     "Base, joint, armour, damage overlay and detached part must align to the same joint pivot.")
    if cat == "planet":
        s = IDX["sectors"][aid.split("_")[1]]
        p = f"Original stylised planet/moon for a galaxy-map screen: {SECTOR_LOOK[s['id']]}. Single round body with its themed surface and small orbiting details, premium painterly-3D look, no text, no UI (see galaxy_map reference)."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"planet centred ({w//2},{h//2})")
    if cat == "background":
        _, sid, layer = aid.split("_")
        look = SECTOR_LOOK[sid]
        layer_txt = {"far": "FAR layer: deep space backdrop, nebula and distant planet, very low contrast and saturation so bullets stay readable",
                     "mid": "MID layer: mid-distance silhouettes and structures, low contrast, mostly transparent",
                     "foreground": "FOREGROUND layer: a few close debris pieces near the left and right edges only, centre clear"}[layer]
        p = (f"Original vertical-scrolling shoot-em-up background, portrait {c}: {look}. {layer_txt}. Top edge and bottom edge must tile seamlessly when stacked vertically. "
             "No ships, no characters, no bullets, no text, no UI.")
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", "full canvas; seamless top/bottom")
    if cat == "hazard":
        hz = IDX["hazards"][aid.split("_")[1]]
        p = f"{STYLE} Environmental hazard object '{hz['name']['en']}' ({hz['behavior']}). Clearly marked as a hazard with a readable warning shape; must never hide enemy bullets."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"centre ({w//2},{h//2})")
    if cat == "fx":
        p = (f"Original game VFX texture: {FX_DESC.get(aid, aid)}. Isolated effect only, centred, fixed pivot, first frame starts small/empty and last frame fades to empty, "
             f"no cropped glow at the edges.")
        note = (f"Flipbook of {frames} frames, same canvas and pivot each frame. If a consistent full sequence is hard, deliver key frames "
                f"000, {int(frames)//2:03d} and {int(frames)-1:03d} first — code interpolates the rest.") if int(frames) > 1 else ""
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"pivot ({w//2},{h//2})", note)
    if cat == "ui_icon":
        p = f"Original game HUD/menu icon: {UI_DESC.get(aid, aid)}. Flat-shaded premium game UI style matching cyan/orange cockpit HUD, bold silhouette readable at 32 px, no text."
        return entry(aid, cat, c, frames, blend, ms, f"{p} {bg_rule(blend, cat)}", f"centred, pivot ({w//2},{h//2})")
    raise ValueError(f"unhandled category {cat} ({aid})")


def pickup_entries():
    out = []
    looks = {
        "PU01": "TRIPLE SHOT: exactly THREE brass bullets in a fan (the reference board shows four — use three)", "PU02": "LASER CORE: cyan glowing capacitor cylinder",
        "PU03": "MISSILE SWARM: cluster of small orange-tipped missiles", "PU04": "CHAIN ARC: ring device crackling with cyan lightning",
        "PU05": "SHIELD: hexagon-pattern cyan energy shield ring", "PU06": "REPAIR: white/green repair drone with a green cross",
        "PU07": "MAGNET: orange horseshoe magnet with floating nuts", "PU08": "COOLANT: cyan canister with a snowflake window",
        "PU09": "OVERDRIVE CELL: red/orange turbine power cell", "PU10": "DRONE WING: two small escort drones",
        "PU11": "FUSION CORE: violet energy orb inside rotating rings", "PU12": "SCRAP CACHE: yellow-black crate overflowing with scrap",
    }
    role = {"PU01": "offense", "PU02": "offense", "PU03": "offense", "PU04": "offense", "PU10": "offense", "PU05": "survival", "PU06": "survival", "PU08": "survival"}
    colour = {"offense": "orange", "survival": "mint-green/cyan", "resource": "gold"}
    for p in PU["pickups"]:
        r = role.get(p["id"], "resource")
        prompt = (f"Original ROCKET BREAKERS power-up pickup icon. {looks[p['id']]}. Single isolated object, front three-quarter view, glowing {colour[r]} accent, "
                  f"crisp silhouette readable at 48 px, upper-left light, premium 2.5D render, no text, no label. {ALPHA} (Style reference: powerups_board.)")
        out.append(entry(p["icon_asset_id"], "pickup_icon", "512x512", 1, "alpha", "M1", prompt, "centred, pivot (256,256)"))
    return out


def batches(entries):
    by = OrderedDict()
    for e in entries:
        by.setdefault(e["id"], e)
    get = lambda ids: [by.pop(i) for i in ids if i in by]
    plan = [
        ("M1 core: hero ship, starter guns, stolen tail, Scorpion boss", get(["hull_H01", "hull_H01_engine_glow", "weapon_W001", "weapon_W008", "weapon_W022", "boss_B02_core", "boss_B02_joint", "boss_B02_signature_mount", "boss_B02_armor", "fx_tractor_mote"]), ["modular_ships", "salvage_sequence"]),
        ("Power-up icons (all 12)", get([f"pickup_pu{i:02d}" for i in range(1, 13)]), ["powerups_board", "gameplay_powerup"]),
        ("M1 enemies, ship states, utilities", get(["enemy_E01", "enemy_E03", "hull_H01_lean_left", "hull_H01_lean_right", "hull_H01_damage_overlay", "boss_B02_damage_overlay", "utility_T001", "utility_T006", "enemy_E02", "enemy_E04"]), ["enemies_board", "modular_ships"]),
        ("Graveyard Belt backgrounds + core effects", get(["bg_P01_far", "bg_P01_mid", "bg_P01_foreground", "fx_explosion_small", "fx_impact_spark", "fx_joint_break", "fx_detach_burst", "fx_shield_hit"]), ["salvage_sequence", "vfx_concepts", "fx_explosion", "fx_shield"]),
        ("HUD icons", get(["ui_dash", "ui_overdrive", "ui_tractor", "ui_lock_joint", "ui_locked_armor", "ui_heat", "ui_energy", "ui_cargo", "ui_repair", "ui_pause", "ui_play", "ui_settings"]), ["gameplay_powerup"]),
        ("Menu icons", get(["ui_star_full", "ui_star_empty", "ui_credits", "ui_scrap", "ui_blueprint", "ui_hangar", "ui_galaxy", "ui_codex", "ui_fusion_core", "ui_extraction"]), ["galaxy_map"]),
        ("Weapon HUD icons for the starter guns + stolen tail", get(["weapon_W001_icon", "weapon_W008_icon", "weapon_W022_icon", "weapon_W001_glow", "weapon_W008_glow", "weapon_W022_glow"]), ["modular_ships"]),
    ]
    out = [(t, items, refs) for t, items, refs in plan if items]
    # Remaining assets grouped by category in manifest order, max 12 per batch.
    ref_for = {"hull": ["modular_ships"], "weapon": ["modular_ships"], "icon": ["modular_ships"], "weapon_glow": ["vfx_concepts"], "utility": ["modular_ships"],
               "ability": ["vfx_concepts"], "fusion": ["vfx_concepts"], "enemy": ["enemies_board"], "boss_part": ["bosses_board", "salvage_sequence"],
               "planet": ["galaxy_map"], "background": ["salvage_sequence", "galaxy_map"], "hazard": ["vfx_concepts"], "fx": ["vfx_concepts", "fx_explosion", "fx_ion", "fx_plasma", "fx_shield"], "ui_icon": ["gameplay_powerup"]}
    title_for = {"hull": "Hull family", "weapon": "Weapon modules", "icon": "Weapon HUD icons", "weapon_glow": "Weapon emitter glows", "utility": "Utility modules",
                 "ability": "Ability icons", "fusion": "Fusion icons", "enemy": "Enemies", "boss_part": "Boss parts", "planet": "Galaxy-map planets",
                 "background": "Sector backgrounds", "hazard": "Hazards", "fx": "Effects", "ui_icon": "UI icons"}
    order = ["enemy", "boss_part", "weapon", "hull", "utility", "background", "planet", "fx", "hazard", "icon", "weapon_glow", "ability", "fusion", "ui_icon"]
    for cat in order:
        rest = [e for e in by.values() if e["category"] == cat]
        if cat == "boss_part":  # one boss = 5 parts; keep two bosses per batch
            groups, cur = [], []
            for e in rest:
                cur.append(e)
                if len(cur) == 10:
                    groups.append(cur); cur = []
            if cur: groups.append(cur)
        elif cat == "hull":  # one hull = 5 states; two hulls per batch
            groups = [rest[i:i + 10] for i in range(0, len(rest), 10)]
        elif cat == "background":  # 3 layers per sector; three sectors per batch
            groups = [rest[i:i + 9] for i in range(0, len(rest), 9)]
        else:
            groups = [rest[i:i + 12] for i in range(0, len(rest), 12)]
        for g in groups:
            ids = sorted({e["id"].split("_")[1] for e in g})
            if cat == "fx":
                label = f"{title_for[cat]} ({len(g)} textures)"
            else:
                label = f"{title_for[cat]} ({ids[0]}–{ids[-1]})" if len(ids) > 1 else f"{title_for[cat]} ({ids[0]})"
            out.append((label, g, ref_for[cat]))
            for e in g: by.pop(e["id"], None)
    assert not by, f"unassigned assets: {list(by)}"
    return out


REF_FILES = {
    "modular_ships": "art/concepts/modular_ships.png", "salvage_sequence": "art/concepts/salvage_sequence.png", "galaxy_map": "art/concepts/galaxy_map.png",
    "vfx_concepts": "art/concepts/vfx_concepts.png", "powerups_board": "expansion_01/art/powerups_board.png", "enemies_board": "expansion_01/art/enemies_board.png",
    "bosses_board": "expansion_01/art/bosses_board.png", "gameplay_powerup": "expansion_01/art/gameplay_powerup.png", "fx_explosion": "expansion_01/art/fx_explosion.png",
    "fx_ion": "expansion_01/art/fx_ion.png", "fx_plasma": "expansion_01/art/fx_plasma.png", "fx_shield": "expansion_01/art/fx_shield.png",
}

START = """# START HERE — instructions for ChatGPT (paste this first)

You are the image artist for ROCKET BREAKERS, an original vertical 2.5D shoot-em-up for phones.
I will send you batch files one at a time. For each batch:

1. Generate the images ONE AT A TIME, in the order listed, using each asset's prompt exactly.
2. Output each image at the requested canvas size (or the closest you can, same aspect ratio) and tell me the actual size.
3. Use the exact file name given (rb_<id>_<frame>.png). Lower-case.
4. Transparent assets must have REAL alpha — no checkerboard painted in, no grey box, no scene.
5. Additive/glow assets: transparent preferred; otherwise pure black background, and say which you used.
6. Keep the object inside the padding guide; nothing cut off at the edges; no text, logos, watermarks or UI frames.
7. Keep camera, light direction (upper-left), scale and style consistent across the whole batch and with earlier batches.
8. Detachable weapons/parts are NEVER painted onto a hull or boss body — they are separate images.
9. When the batch is done, give me all files of the batch together (a ZIP if you can).

Global style:
""" + STYLE + "\n\n" + PLAYER + "\n" + HOSTILE + """

Colour language: kinetic = gold/white, player beam = cyan with white core, plasma = purple (player plasma gets a cyan rim),
ion = thin branching cyan, thermal = orange ribbons with dark embers, cryo = pale blue shards, gravity = violet rings.
Neutral salvage = amber outline; weak joints = amber BROKEN-ring look; armour = CLOSED shield look.
Reference images are style guides only — do not copy their compositions, text or labels, and do not cut them up.
"""

README_TH = """# แพ็กสั่งภาพ ROCKET BREAKERS สำหรับ ChatGPT

แพ็กนี้มีคำสั่งสร้างภาพ **ครบทุกภาพของเกมเวอร์ชัน 1** ({total} ภาพ แบ่งเป็น {nb} ชุด) สร้างอัตโนมัติจากข้อมูลเกมจริง
(`asset_manifest.csv`, `catalog.json`, `powerups.json`) ทุกภาพมีชื่อไฟล์ ขนาด จุดยึด และข้อกำหนดพื้นหลังโปร่งใสกำกับไว้

## วิธีใช้กับ ChatGPT

1. เปิดแชตใหม่ใน ChatGPT แล้วแนบไฟล์ `00_START_HERE_FOR_CHATGPT.md` ให้มันอ่านก่อน (กฎการสร้างภาพทั้งหมด)
2. ส่งทีละชุด เริ่มจาก `batches/BATCH_001.md` แนบภาพอ้างอิงที่ชุดนั้นระบุ (อยู่ในโฟลเดอร์ `references/`)
3. ให้ ChatGPT สร้างทีละภาพตามลำดับ และตั้งชื่อไฟล์ตามที่กำหนดเป๊ะ ๆ
4. ได้ภาพครบชุดแล้ว รวมเป็น ZIP ส่งกลับมาให้ Claude ผมจะตรวจ alpha ขนาด และจุดยึด ก่อนใส่เข้าเกม
   ถ้าภาพไหนผิด ผมจะส่งรายการแก้เฉพาะภาพนั้นกลับไป ไม่ต้องสร้างใหม่ทั้งชุด
5. ทำเรียงตามเลขชุด: ชุด 001–007 สำคัญที่สุด (ใช้ในด่านที่เล่นได้ตอนนี้) ที่เหลือคือเนื้อหาด่านถัดไป

## ลำดับความสำคัญ

{priority}

## ไฟล์ในแพ็ก

- `00_START_HERE_FOR_CHATGPT.md` — กฎสำหรับ ChatGPT (ส่งก่อนทุกครั้งที่เปิดแชตใหม่)
- `batches/BATCH_###.md` — คำสั่งรายชุด พร้อมพรอมต์ภาษาอังกฤษที่ก๊อปวางได้ทันที
- `ASSET_CHECKLIST.csv` — รายการภาพทั้งหมด ไว้ติ๊กว่าได้ภาพไหนแล้ว
- `references/` — ภาพอ้างอิงสไตล์ (ย่อขนาดแล้ว) ห้ามให้ ChatGPT ตัดภาพบอร์ดไปใช้เป็น sprite

## หมายเหตุ

- เอฟเฟกต์แบบหลายเฟรม (เช่น ระเบิด 12 เฟรม) ถ้า ChatGPT ทำต่อเนื่องไม่สวย ให้ส่งเฟรมแรก กลาง และท้ายมาก่อน โค้ดเกมจะเติมการเคลื่อนไหวให้
- ภาพที่ได้จะมีสถานะ "รอตรวจ" จนกว่าผมตรวจผ่านในเกมจริง
- ไอคอน "ยิงสามทาง" ต้องมีกระสุน 3 ลูก (บอร์ดตัวอย่างวาด 4 ลูก)
- แพ็กนี้ใช้แทน `art/requests/BATCH_001.md` และ `BATCH_002.md` ฉบับเก่า (เนื้อหาเดิมรวมอยู่ในชุด 001–002 ของแพ็กนี้แล้ว)
- สร้างแพ็กใหม่ได้ทุกเมื่อด้วย `python3 tools/build_art_pack.py --zip OUT.zip` (ข้อมูลเกมเปลี่ยน แพ็กจะอัปเดตตาม)
"""


def render_batch(n, title, items, refs):
    lines = [f"# BATCH_{n:03d} — {title}", "",
             f"Assets: {len(items)} · Attach reference images: " + ", ".join(f"`references/{r}.jpg`" for r in refs), "",
             "Paste to ChatGPT (after 00_START_HERE was sent in this chat):", "",
             f"> Please create the {len(items)} images of BATCH_{n:03d} below, one at a time, in order. Follow each prompt, canvas, background rule and file name exactly. "
             "Use the attached references for style only.", ""]
    for i, e in enumerate(items, 1):
        files = e["files"][0] if e["frames"] == 1 else f"{e['files'][0]} … {e['files'][-1]} ({e['frames']} frames)"
        lines += [f"## {i}. `{e['id']}`", "",
                  f"- File: `{files}`", f"- Canvas: {e['canvas']} px · blend: {e['blend']} · milestone: {e['milestone']}", f"- Anchors / layout: {e['anchors']}"]
        if e["notes"]:
            lines.append(f"- Note: {e['notes']}")
        lines += ["", "```text", e["prompt"], "```", ""]
    lines += ["## Acceptance (Claude checks on return)", "",
              "Correct object and orientation (nose up) · real alpha tested on black/white/checker · requested canvas or same aspect · "
              "no text/watermark · nothing clipped · consistent scale and light across the batch · detachable parts kept separate.", ""]
    return "\n".join(lines)


def build(out_dir: Path):
    entries = [describe(r) for r in MANIFEST if r["category"] != "concept"] + pickup_entries()
    plan = batches(entries)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    (out_dir / "batches").mkdir(parents=True)
    (out_dir / "00_START_HERE_FOR_CHATGPT.md").write_text(START, encoding="utf-8")
    rows = []
    for n, (title, items, refs) in enumerate(plan, 1):
        (out_dir / "batches" / f"BATCH_{n:03d}.md").write_text(render_batch(n, title, items, refs), encoding="utf-8")
        for e in items:
            rows.append([f"BATCH_{n:03d}", e["id"], e["category"], e["canvas"], e["frames"], e["blend"], e["milestone"], e["files"][0], "requested"])
    with (out_dir / "ASSET_CHECKLIST.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["batch", "asset_id", "category", "canvas", "frames", "blend", "milestone", "first_file", "status"])
        w.writerows(rows)
    priority = "\n".join(f"- BATCH_{n:03d}: {title} ({len(items)})" for n, (title, items, _) in enumerate(plan, 1))
    (out_dir / "README_TH.md").write_text(README_TH.format(total=len(rows), nb=len(plan), priority=priority), encoding="utf-8")
    return plan, rows


def make_zip(out_dir: Path, zip_path: Path):
    from PIL import Image
    refs = out_dir.parent / "_references_tmp"
    if refs.exists():
        shutil.rmtree(refs)
    refs.mkdir()
    for name, rel in REF_FILES.items():
        im = Image.open(ROOT / rel)
        if im.mode == "RGBA":  # composite alpha VFX on dark so the style is visible
            bg = Image.new("RGBA", im.size, (11, 20, 36, 255))
            bg.alpha_composite(im)
            im = bg
        im = im.convert("RGB")
        im.thumbnail((1400, 1400))
        im.save(refs / f"{name}.jpg", quality=88)
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        base = "ROCKET_BREAKERS_ART_REQUESTS"
        for p in sorted(out_dir.rglob("*")):
            if p.is_file():
                z.write(p, f"{base}/{p.relative_to(out_dir)}")
        for p in sorted(refs.iterdir()):
            z.write(p, f"{base}/references/{p.name}")
    shutil.rmtree(refs)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", type=Path, help="also write a zip with reference images")
    args = ap.parse_args()
    plan, rows = build(OUT)
    print(f"{len(rows)} assets in {len(plan)} batches -> {OUT.relative_to(ROOT)}")
    if args.zip:
        make_zip(OUT, args.zip)
        print(f"zip -> {args.zip} ({args.zip.stat().st_size // 1024} KB)")
