import { enemies, getWeapon, heroes, stages, turrets, type Enemy, type Hero, type Stage, type Turret } from '@runegate/data';
import { battleSquad, TEAM_SIZE, toggleTeamMember, type PlayerState } from '@runegate/meta';
import { portraitDataUrl } from '../render/sprites.js';
import { CLASS_TH, ELEMENT_COLOR, ELEMENT_TH, RACE_TH, TIER_TH, TRAIT_TH, h, starHtml, toast, type EnemyTier } from './common.js';
import { walletBar } from './heroes.js';
import { save } from './save.js';

/** ทีมที่ส่งเข้าด่าน — โครงตรงกับ `SquadEntry` ของ sim */
export type BattleSquad = ReturnType<typeof battleSquad>;

/** เลเวลที่แนะนำต่อด่าน (ตรงกับเกณฑ์ใน balance runner) */
export function recommendedLevel(stage: Stage): number {
  const table: Record<string, number> = { ch1_01: 1, ch1_02: 8, ch1_03: 15, ch1_04: 28 };
  return table[stage.id] ?? 1 + (stage.index - 1) * 7;
}

export function stageSelectScreen(
  onPick: (stage: Stage) => void,
  onBestiary: () => void,
  onArsenal: () => void,
  onHeroes: () => void,
): HTMLElement {
  const cards = stages.map((s) => {
    const best = save.bestStars(s.id);
    return h(
      'button',
      { class: 'stage-card', onclick: () => onPick(s) },
      h(
        'div',
        { class: 'row' },
        h('h3', {}, `บทที่ ${s.chapter}-${s.index} · ${s.name_th}`),
        h('span', { class: 'stars', html: starHtml(best) }),
      ),
      h('p', { class: 'brief' }, s.brief_th),
      h(
        'div',
        { class: 'meta' },
        h('span', {}, `พลังงาน ${s.energyCost}`),
        h('span', {}, `ฐาน ${s.baseHp}`),
        h('span', {}, `${s.waves.length} เวฟ`),
        h('span', { class: 'rec' }, `แนะนำ Lv.${recommendedLevel(s)}`),
      ),
    );
  });

  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-inner' },
      h(
        'div',
        { class: 'brand' },
        h('h1', { class: 'wordmark' }, 'RUNEGATE'),
        h('p', { class: 'sub-th' }, 'ปิดประตูมิติก่อนกองทัพอสูรจะทะลักเข้ามา'),
        h('p', {}, `ดาวสะสม ★ ${save.totalStars()} / ${stages.length * 3}`),
      ),
      walletBar(),
      h('div', { class: 'section-title' }, 'วิธีเล่น'),
      h(
        'ol',
        { class: 'howto' },
        h('li', {}, h('b', {}, 'แตะการ์ดฮีโร่'), ' ด้านล่างจอ แล้วแตะช่องที่ไฮไลต์ จากนั้นเลือกทิศที่จะให้หันหน้า'),
        h('li', {}, h('b', {}, 'ฮีโร่ระยะประชิด'), ' ลงได้บนพื้น/ทางเดิน และจะ ', h('b', {}, 'บล็อค'), ' ศัตรูไม่ให้เดินผ่าน'),
        h('li', {}, h('b', {}, 'ฮีโร่ระยะไกล'), ' ลงได้เฉพาะที่สูง (แท่นหินยกระดับ) — ตีศัตรูบินได้ด้วย'),
        h('li', {}, 'แตะฮีโร่ที่วางแล้วเพื่อกด ', h('b', {}, 'ท่าไม้ตาย'), ' หรือ ', h('b', {}, 'ถอนกลับ'), ' (คืนแต้มวางครึ่งหนึ่ง)'),
        h('li', {}, 'ลากนิ้วเพื่อหมุนกล้อง จีบสองนิ้วเพื่อซูม · ปุ่ม ▶ เร่งความเร็วได้ถึง 3 เท่า'),
      ),
      h('div', { class: 'section-title' }, 'เลือกด่าน'),
      h('div', { class: 'stage-list' }, ...cards),
      h(
        'div',
        { class: 'codex-cta' },
        h('button', { class: 'ghost', onclick: onBestiary }, `📖 สมุดมอนสเตอร์ (${enemies.length} ชนิด)`),
        h('button', { class: 'ghost', onclick: onArsenal }, `🔧 คลังเครื่องยิง (${turrets.length} แบบ)`),
        h('button', { class: 'ghost', onclick: onHeroes }, `🛡️ คลังฮีโร่ (${heroes.length} นาย)`),
        h('span', {}, `ธรรมดา ${count('normal')} · มินิบอส ${count('elite')} · บอส MVP ${count('mvp')}`),
      ),
      h('div', { class: 'section-title' }, 'กองกำลังของคุณ'),
      teamStrip(save.state, onHeroes),
    ),
  );
}

function heroCard(hero: Hero, selected: boolean, onclick?: () => void, badge?: string): HTMLElement {
  const img = h('img', { class: 'pic', src: portraitDataUrl(hero.sprite), alt: hero.name_th });
  return h(
    'div',
    { class: `hero-card${selected ? ' selected' : ''}`, 'data-hero': hero.id, ...(onclick ? { onclick } : {}) },
    h('span', { class: 'rar' }, '★'.repeat(hero.rarity)),
    h('span', { class: 'cost' }, badge ?? String(hero.cost)),
    img,
    h('div', { class: 'nm' }, hero.name_th),
    h(
      'div',
      { class: 'sub' },
      h('span', { class: 'el-dot', style: `background:${ELEMENT_COLOR[hero.element]}` }),
      h('span', {}, `${ELEMENT_TH[hero.element]} · ${CLASS_TH[hero.class]}`),
    ),
  );
}

/** แถบทีมย่อบนหน้าเลือกด่าน */
function teamStrip(state: PlayerState, onHeroes: () => void): HTMLElement {
  if (state.team.length === 0) {
    return h(
      'div',
      { class: 'team-strip empty' },
      h('span', {}, 'ยังไม่ได้จัดทีม'),
      h('button', { class: 'ghost', onclick: onHeroes }, 'จัดทีม'),
    );
  }
  return h(
    'div',
    { class: 'team-strip', onclick: onHeroes },
    ...state.team.map((id) => {
      const hero = heroes.find((x) => x.id === id);
      const hs = state.roster[id];
      if (!hero || !hs) return h('span', {});
      return h(
        'div',
        { class: 'team-chip' },
        h('img', { src: portraitDataUrl(hero.sprite), alt: hero.name_th }),
        h('span', {}, `${hero.name_th.split(' ')[0]} Lv.${hs.level}`),
      );
    }),
  );
}

/** หน้าจัดทีมก่อนลงด่าน — เลือกได้เฉพาะฮีโร่ที่มีในคลัง เลเวลมาจากที่อัพไว้จริง */
export function squadScreen(
  stage: Stage,
  onStart: (squad: BattleSquad) => void,
  onBack: () => void,
  onHeroes: () => void,
): HTMLElement {
  const grid = h('div', { class: 'hero-grid' });
  const counter = h('div', { class: 'grow' });
  const startBtn = h('button', { class: 'primary' }, 'เริ่มด่าน');
  const wallet = h('div', { class: 'wallet-slot' });
  const root = h('div', { class: 'screen' });

  const refresh = (): void => {
    const s = save.state;
    const owned = heroes.filter((x) => s.roster[x.id]);
    grid.replaceChildren(
      ...owned.map((hero) => {
        const hs = s.roster[hero.id]!;
        return heroCard(
          hero,
          s.team.includes(hero.id),
          () => {
            const res = save.apply(toggleTeamMember(save.state, hero.id));
            if (!res.ok) toast(root, res.reason_th);
            refresh();
          },
          `Lv.${hs.level}`,
        );
      }),
    );
    counter.textContent = `เลือกแล้ว ${s.team.length}/${TEAM_SIZE} ตัว`;
    startBtn.toggleAttribute('disabled', s.team.length === 0);
    wallet.replaceChildren(walletBar());
  };

  startBtn.addEventListener('click', () => onStart(battleSquad(save.state)));

  refresh();
  root.append(
    h(
      'div',
      { class: 'screen-inner' },
      h('div', { class: 'brand' }, h('h1', {}, stage.name_th), h('p', {}, stage.brief_th)),
      wallet,
      h('div', { class: 'section-title' }, 'จัดกองกำลัง'),
      h(
        'p',
        { class: 'tier-note' },
        `แนะนำเลเวล ${recommendedLevel(stage)} ขึ้นไป · แตะการ์ดเพื่อเข้า/ออกทีม · อัพฮีโร่ได้ที่ปุ่ม "คลังฮีโร่"`,
      ),
      grid,
      h(
        'div',
        { class: 'sticky-actions' },
        h('button', { class: 'ghost', onclick: onBack }, '← กลับ'),
        h('button', { class: 'ghost', onclick: onHeroes }, '🛡️ คลังฮีโร่'),
        counter,
        startBtn,
      ),
    ),
  );
  return root;
}


function count(tier: EnemyTier): number {
  return enemies.filter((e) => e.tier === tier).length;
}

function stagesWith(enemyId: string): string[] {
  const out: string[] = [];
  for (const s of stages) {
    if (s.waves.some((w) => w.groups.some((g) => g.enemy === enemyId))) out.push(`${s.chapter}-${s.index}`);
  }
  return out;
}

function monsterCard(e: Enemy): HTMLElement {
  const where = stagesWith(e.id);
  return h(
    'div',
    { class: `mon-card tier-${e.tier}` },
    h('span', { class: `tier-badge tier-${e.tier}` }, TIER_TH[e.tier]),
    h('img', { class: 'pic', src: portraitDataUrl(e.sprite), alt: e.name_th }),
    h('div', { class: 'nm' }, e.name_th),
    h(
      'div',
      { class: 'sub' },
      h('span', { class: 'el-dot', style: `background:${ELEMENT_COLOR[e.element]}` }),
      h('span', {}, `${ELEMENT_TH[e.element]} · ${RACE_TH[e.race]}`),
    ),
    h(
      'div',
      { class: 'mon-stats' },
      h('span', {}, `HP ${e.hp.toLocaleString('th-TH')}`),
      h('span', {}, `ATK ${e.atk}`),
      h('span', {}, `DEF ${e.def}`),
    ),
    e.traits.length > 0
      ? h('div', { class: 'chips' }, ...e.traits.filter((t) => t !== 'elite' && t !== 'boss').map((t) => h('span', { class: 'chip' }, TRAIT_TH[t])))
      : null,
    h('div', { class: 'where' }, where.length > 0 ? `ปรากฏในด่าน ${where.join(', ')}` : 'ยังไม่ลงด่าน — รอบทที่ 2'),
  );
}

export function bestiaryScreen(onBack: () => void): HTMLElement {
  const section = (tier: EnemyTier, title: string, note: string): HTMLElement[] => {
    const list = enemies.filter((e) => e.tier === tier);
    return [
      h('div', { class: 'section-title' }, `${title} (${list.length})`),
      h('p', { class: 'tier-note' }, note),
      h('div', { class: 'mon-grid' }, ...list.map(monsterCard)),
    ];
  };
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-inner' },
      h('div', { class: 'brand' }, h('h1', { class: 'wordmark' }, 'BESTIARY'), h('p', { class: 'sub-th' }, `สมุดมอนสเตอร์ — ${enemies.length} ชนิด`)),
      ...section('mvp', 'บอส MVP', 'บอสประจำบท เลือดหนามาก มีสกิลเรียกลูกสมุนและบัฟตัวเอง ต้องจัดทีมมาเฉพาะ'),
      ...section('elite', 'มินิบอส', 'โผล่กลางด่าน หนากว่ามอนธรรมดาหลายเท่าและมีสกิลของตัวเอง'),
      ...section('normal', 'มอนสเตอร์ธรรมดา', 'กำลังพลหลักของทัพอสูร มาเป็นเวฟ บางชนิดบิน ล่องหน หุ้มเกราะ หรือฮีลพวกเดียวกัน'),
      h('div', { class: 'sticky-actions' }, h('button', { class: 'ghost', onclick: onBack }, '← กลับ')),
    ),
  );
}


function turretCard(t: Turret): HTMLElement {
  const w = getWeapon(t.weapon);
  const nextNames = t.upgradesTo.map((id) => turrets.find((x) => x.id === id)?.name_th ?? id);
  const tags: string[] = [];
  if (w.shots > 1 && w.burstIntervalSec > 0) tags.push(`ยิงรัว ${w.shots} นัด`);
  if (w.shots > 1 && w.spreadDeg > 0) tags.push(`กระจาย ${w.shots} ทาง`);
  if (w.pierce > 0) tags.push(`ทะลุ ${w.pierce} ตัว`);
  if (w.aoeRadius > 0) tags.push(`ระเบิดวง ${w.aoeRadius}`);
  if (w.homingTurnRate > 0) tags.push('ตามเป้า');
  if (w.splitOnHit) tags.push(`แตก ${w.splitOnHit.shots} ลูก`);
  if (t.antiAir > 0) tags.push(`ตีตัวบิน +${Math.round(t.antiAir * 100)}%`);

  return h(
    'div',
    { class: `mon-card turret-card tier-t${t.tier}` },
    h('span', { class: `tier-badge tier-t${t.tier}` }, `ขั้น ${t.tier}`),
    h('img', { class: 'pic', src: portraitDataUrl(t.sprite), alt: t.name_th }),
    h('div', { class: 'nm' }, t.name_th),
    h('div', { class: 'sub' }, h('span', { class: 'el-dot', style: `background:${ELEMENT_COLOR[t.element]}` }), h('span', {}, w.name_th)),
    h(
      'div',
      { class: 'mon-stats' },
      h('span', {}, `${t.cost} แต้ม`),
      h('span', {}, `ATK ${t.atk}`),
      h('span', {}, `ระยะ ${t.range}`),
      h('span', {}, `${t.aspd.toFixed(2)}/วิ`),
    ),
    tags.length > 0 ? h('div', { class: 'chips' }, ...tags.map((x) => h('span', { class: 'chip' }, x))) : null,
    h('div', { class: 'where' }, t.desc_th),
    nextNames.length > 0 ? h('div', { class: 'upnext' }, `↑ ${nextNames.join(' / ')}`) : h('div', { class: 'upnext final' }, 'ขั้นสูงสุด'),
  );
}

export function arsenalScreen(onBack: () => void): HTMLElement {
  const tierSection = (tier: 1 | 2 | 3, title: string, note: string): HTMLElement[] => {
    const list = turrets.filter((t) => t.tier === tier);
    return [
      h('div', { class: 'section-title' }, `${title} (${list.length})`),
      h('p', { class: 'tier-note' }, note),
      h('div', { class: 'mon-grid' }, ...list.map(turretCard)),
    ];
  };
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-inner' },
      h('div', { class: 'brand' }, h('h1', { class: 'wordmark' }, 'ARSENAL'), h('p', { class: 'sub-th' }, 'คลังเครื่องยิง — สร้างบนแท่นในด่าน แล้วอัพเกรดต่อระหว่างรบ')),
      h(
        'p',
        { class: 'tier-note' },
        'เครื่องยิงไม่ผูกกับเลเวลฮีโร่ พลังมาจากการทุ่มแต้มวางอัพเกรดล้วนๆ และไม่กินโควตาช่องวางฮีโร่ ' +
          'ทุกสายเริ่มจากเครื่องยิงหินเหมือนกันหมด แล้วแยกเป็น 3 ทางตามสถานการณ์',
      ),
      ...tierSection(1, 'ขั้นที่ 1 — จุดเริ่มต้น', 'ปาก้อนหินวิถีโค้ง ยิงช้าแต่ลงเป็นวง ราคาถูกที่สุด สร้างคลุมพื้นที่ไว้ก่อนแล้วค่อยเลือกสาย'),
      ...tierSection(2, 'ขั้นที่ 2 — เลือกสาย', 'สายรัว = DPS ต่อเนื่อง · สายกระจาย = กวาดฝูง · สายครก = ระเบิดวงกว้างระยะไกล'),
      ...tierSection(3, 'ขั้นที่ 3 — ขั้นสูงสุด', 'แต่ละสายแยกได้อีก 2 ทาง รวม 6 ปลายทาง เลือกตามศัตรูที่จะเจอ'),
      h('div', { class: 'sticky-actions' }, h('button', { class: 'ghost', onclick: onBack }, '← กลับ')),
    ),
  );
}
