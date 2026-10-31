"""Validate the design handoff, not an implemented game's behavior.
Run: python3 tools/validate_bundle.py (Python standard library only).
"""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cat = json.loads((ROOT / 'data/catalog.json').read_text(encoding='utf-8'))
expected = {'sectors':8,'missions':48,'hulls':12,'weapons':36,'abilities':12,'utilities':12,'bosses':16,'enemies':24,'hazards':8,'fusions':8}
index = {}
for group, count in expected.items():
    rows = cat[group]
    assert len(rows) == count, (group, len(rows), count)
    ids = [r['id'] for r in rows]
    assert len(set(ids)) == len(ids), ('duplicate IDs', group)
    index[group] = {r['id']:r for r in rows}
assert sum(len(m['star_objectives']) for m in cat['missions']) == 144
assert cat['counts']['campaign_stars'] == 144
for m in cat['missions']:
    assert m['sector_id'] in index['sectors']
    assert m['unlock_prev'] is None or m['unlock_prev'] in index['missions']
    assert m['hazard_id'] in index['hazards']
    assert m['encounter_id'] is None or m['encounter_id'] in index['bosses']
    for w in m['waves']:
        if 'enemy_id' in w: assert w['enemy_id'] in index['enemies']
        if 'encounter_id' in w: assert w['encounter_id'] in index['bosses']
    for obj in m['star_objectives']:
        if obj['key'] == 'secure_signature': assert obj['target_id'] in index['weapons']
    assert m['rewards']['credits'] > 0 and m['rewards']['scrap'] > 0
for b in cat['bosses']:
    w = index['weapons'][b['signature_weapon_id']]
    assert w['salvage_source'] == b['id']
    assert b['sector_id'] in index['sectors']
    assert b['ability_unlock_id'] is None or index['abilities'][b['ability_unlock_id']]['unlock_source'] == b['id']
for a in cat['abilities']: assert a['unlock_source'] in index['bosses']
for s in cat['sectors']:
    ms = [m for m in cat['missions'] if m['sector_id'] == s['id']]
    assert len(ms) == 6
    assert s['unlock_total_stars'] <= (int(s['id'][1:])-1)*6
    assert s['requires_previous_final'] is None or s['requires_previous_final'] in index['missions']
for h in cat['hulls']:
    mask = {tuple(c) for c in h['socket_mask']}
    assert len(mask)==len(h['socket_mask'])
    assert tuple(h['reactor_cell']) in mask
    occupied=set();mass=0;energy=0
    for item in h['starter_loadout'] or []:
        w=index['weapons'][item['weapon_id']]
        cells={(item['grid_origin'][0]+p[0],item['grid_origin'][1]+p[1]) for p in w['footprint']}
        assert cells<=mask and not cells&occupied
        occupied|=cells;mass+=w['mass'];energy+=w['energy_per_trigger']*w['trigger_rate']
    assert mass <= h['mass_cap']
    assert energy <= h['energy_regen']*0.8 + 1e-6
for w in cat['weapons']:
    assert w['damage']>0 and w['trigger_rate']>0
    assert w['salvage_source'] is None or w['salvage_source'] in index['bosses']
    assert len({tuple(c) for c in w['footprint']})==len(w['footprint'])
for f in cat['fusions']: assert f['requires_utility'] in index['utilities']
assets=list(csv.DictReader((ROOT/'art/asset_manifest.csv').open(encoding='utf-8')))
asset_index={a['asset_id']:a for a in assets}
assert len(asset_index)==len(assets)
for group in ['hulls','weapons','abilities','utilities','enemies','hazards','fusions']:
    for row in cat[group]: assert row['asset_id'] in asset_index, row['asset_id']
for b in cat['bosses']: assert b['core_asset_id'] in asset_index and b['signature_asset_id'] in asset_index
for s in cat['sectors']: assert s['planet_asset_id'] in asset_index
provenance=json.loads((ROOT/'art/concept_provenance.json').read_text(encoding='utf-8'))
for f in provenance['files']:
    p=ROOT/f['path']; assert p.is_file(), str(p)
    assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'], str(p)
for file in ['AGENTS.md','CLAUDE_START.md','docs/SYSTEMS.md','docs/TECHNICAL.md','docs/ART_BIBLE.md','docs/PRODUCTION.md','docs/ATTACK_LIBRARY.md','docs/CONTENT_CATALOG.md','art/requests/BATCH_001.md']:
    assert (ROOT/file).is_file(), file
print(json.dumps({'status':'PASS','design_counts':expected,'campaign_stars':144,'asset_manifest_rows':len(assets),'concept_images':len(provenance['files']),'note':'Data/package integrity only; gameplay is not yet implemented or playtested.'},ensure_ascii=False,indent=2))
