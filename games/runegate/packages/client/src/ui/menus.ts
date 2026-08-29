import { enemies, heroes, stages, type Enemy, type Hero, type Stage } from '@runegate/data';
import { portraitDataUrl } from '../render/sprites.js';
import { CLASS_TH, ELEMENT_COLOR, ELEMENT_TH, RACE_TH, TIER_TH, TRAIT_TH, h, progress, starHtml, toast, type EnemyTier } from './common.js';

const SQUAD_SIZE = 8;

/** เลเวลที่แนะนำต่อด่าน (ตรงกับเกณฑ์ใน balance runner) */
export function recommendedLevel(stage: Stage): number {
  const table: Record<string, number> = { ch1_01: 1, ch1_02: 8, ch1_03: 15, ch1_04: 28 };
  return table[stage.id] ?? 1 + (stage.index - 1) * 7;
}

export function stageSelectScreen(onPick: (stage: Stage) => void, onBestiary: () => void): HTMLElement {
  const cards = stages.map((s) => {
    const best = progress.bestStars(s.id);
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
        h('p', {}, `ดาวสะสม ★ ${progress.totalStars()} / ${stages.length * 3}`),
      ),
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
        h('span', {}, `ธรรมดา ${count('normal')} · มินิบอส ${count('elite')} · บอส MVP ${count('mvp')}`),
      ),
      h(
        'div',
        { class: 'section-title' },
        `กองกำลังรูนเกต (${heroes.length} นาย)`,
      ),
      h('div', { class: 'hero-grid' }, ...heroes.map((hero) => heroCard(hero, false))),
    ),
  );
}

function heroCard(hero: Hero, selected: boolean, onclick?: () => void): HTMLElement {
  const img = h('img', { class: 'pic', src: portraitDataUrl(hero.sprite), alt: hero.name_th });
  return h(
    'div',
    { class: `hero-card${selected ? ' selected' : ''}`, 'data-hero': hero.id, ...(onclick ? { onclick } : {}) },
    h('span', { class: 'rar' }, '★'.repeat(hero.rarity)),
    h('span', { class: 'cost' }, String(hero.cost)),
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

export function squadScreen(
  stage: Stage,
  onStart: (squad: string[], level: number) => void,
  onBack: () => void,
): HTMLElement {
  const saved = progress.squad().filter((id) => heroes.some((x) => x.id === id));
  const picked = new Set<string>(saved.length > 0 ? saved.slice(0, SQUAD_SIZE) : defaultSquad());
  let level = progress.level() || recommendedLevel(stage);

  const grid = h('div', { class: 'hero-grid' });
  const counter = h('div', { class: 'grow' });
  const startBtn = h('button', { class: 'primary' }, 'เริ่มด่าน');
  const root = h('div', { class: 'screen' });

  const refresh = (): void => {
    grid.replaceChildren(
      ...heroes.map((hero) =>
        heroCard(hero, picked.has(hero.id), () => {
          if (picked.has(hero.id)) picked.delete(hero.id);
          else if (picked.size >= SQUAD_SIZE) {
            toast(root, `เลือกได้สูงสุด ${SQUAD_SIZE} ตัว`);
            return;
          } else picked.add(hero.id);
          refresh();
        }),
      ),
    );
    counter.textContent = `เลือกแล้ว ${picked.size}/${SQUAD_SIZE} ตัว`;
    startBtn.toggleAttribute('disabled', picked.size === 0);
  };

  const levelLabel = h('b', {}, `Lv.${level}`);
  const slider = h('input', {
    type: 'range',
    min: '1',
    max: '40',
    value: String(level),
    oninput: (e: Event) => {
      level = Number((e.target as HTMLInputElement).value);
      levelLabel.textContent = `Lv.${level}`;
    },
  });

  startBtn.addEventListener('click', () => {
    progress.setSquad([...picked]);
    progress.setLevel(level);
    onStart([...picked], level);
  });

  refresh();
  root.append(
    h(
      'div',
      { class: 'screen-inner' },
      h(
        'div',
        { class: 'brand' },
        h('h1', {}, stage.name_th),
        h('p', {}, stage.brief_th),
      ),
      h('div', { class: 'section-title' }, 'จัดกองกำลัง'),
      grid,
      h(
        'div',
        { class: 'level-row' },
        h('span', {}, 'เลเวลฮีโร่ (ชั่วคราวสำหรับทดสอบ — ระบบเลเวลจริงอยู่ Phase 4)'),
        levelLabel,
      ),
      slider,
      h(
        'div',
        { class: 'sticky-actions' },
        h('button', { class: 'ghost', onclick: onBack }, '← กลับ'),
        counter,
        startBtn,
      ),
    ),
  );
  return root;
}

function defaultSquad(): string[] {
  const order = [
    'warden_kael',
    'forgemaster_durn',
    'militia_swordsman',
    'sylvane_archer',
    'archmage_ignis',
    'cleric_seraphine',
    'hexer_morrin',
    'quartermaster_pell',
  ];
  return order.filter((id) => heroes.some((h2) => h2.id === id)).slice(0, SQUAD_SIZE);
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
