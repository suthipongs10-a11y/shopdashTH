/** หน้าคลังฮีโร่ + หน้ารายละเอียดฮีโร่ (อัพเลเวล/ดาว/ปลุกพลัง/สกิล) */
import {
  getHero,
  getSkill,
  heroes,
  heroStats,
  maxLevelForStar,
  naturalStar,
  progression,
  skillFor,
  expToNextLevel,
  type Hero,
} from '@runegate/data';
import {
  awakenCost,
  awakenHero,
  costLine_th,
  feedExpPotions,
  itemName_th,
  levelUpCost,
  levelUpHero,
  skillUpCost,
  skillUpHero,
  starUpCost,
  starUpHero,
  TEAM_SIZE,
  toggleTeamMember,
  type Cost,
  type HeroState,
} from '@runegate/meta';

import { portraitDataUrl } from '../render/sprites.js';
import { CLASS_TH, ELEMENT_COLOR, ELEMENT_TH, h, starHtml, toast } from './common.js';
import { save } from './save.js';

/** ชื่อไทยของไอเทม โดยเติมชื่อฮีโร่ให้เศษวิญญาณอ่านรู้เรื่อง */
export function itemLabel(item: string): string {
  if (item.startsWith('shard_')) {
    const hero = heroes.find((x) => x.id === item.slice('shard_'.length));
    return itemName_th(item, hero?.name_th);
  }
  return itemName_th(item);
}

const costText = (c: Cost): string => costLine_th(c, itemLabel);

export function walletBar(): HTMLElement {
  const s = save.state;
  return h(
    'div',
    { class: 'wallet' },
    h('span', {}, `🪙 ${s.gold.toLocaleString('th-TH')}`),
    h('span', {}, `💎 ${s.gems.toLocaleString('th-TH')}`),
    h('span', {}, `🧪 ${s.materials['hero_exp_potion'] ?? 0}`),
    h('span', {}, `📜 ${s.materials['skill_scroll'] ?? 0}`),
  );
}

/** การ์ดฮีโร่ที่มีอยู่จริงในคลัง (โชว์เลเวล/ดาวจริง) */
function rosterCard(hero: Hero, hs: HeroState, inTeam: boolean, onclick: () => void): HTMLElement {
  return h(
    'div',
    { class: `hero-card owned${inTeam ? ' in-team' : ''}`, onclick },
    h('span', { class: 'rar' }, '★'.repeat(hs.star)),
    h('span', { class: 'cost' }, `Lv.${hs.level}`),
    h('img', { class: 'pic', src: portraitDataUrl(hero.sprite), alt: hero.name_th }),
    h('div', { class: 'nm' }, hs.awakened ? `${hero.name_th} ✦` : hero.name_th),
    h(
      'div',
      { class: 'sub' },
      h('span', { class: 'el-dot', style: `background:${ELEMENT_COLOR[hero.element]}` }),
      h('span', {}, `${ELEMENT_TH[hero.element]} · ${CLASS_TH[hero.class]}`),
    ),
    inTeam ? h('span', { class: 'team-flag' }, 'ในทีม') : null,
  );
}

/** หน้าคลังฮีโร่ — แตะการ์ดเพื่อเปิดรายละเอียด */
export function heroesScreen(onBack: () => void): HTMLElement {
  const root = h('div', { class: 'screen' });

  const render = (): void => {
    const s = save.state;
    const owned = heroes.filter((x) => s.roster[x.id]);
    const locked = heroes.filter((x) => !s.roster[x.id]);
    root.replaceChildren(
      h(
        'div',
        { class: 'screen-inner' },
        h(
          'div',
          { class: 'brand' },
          h('h1', { class: 'wordmark' }, 'HEROES'),
          h('p', { class: 'sub-th' }, `คลังฮีโร่ — มีอยู่ ${owned.length} / ${heroes.length} นาย`),
        ),
        walletBar(),
        h('div', { class: 'section-title' }, `ทีมปัจจุบัน (${s.team.length}/${TEAM_SIZE})`),
        h(
          'p',
          { class: 'tier-note' },
          'แตะการ์ดเพื่อดูรายละเอียดและอัพฮีโร่ · ปุ่ม "เข้าทีม/ออกจากทีม" อยู่ในหน้ารายละเอียด',
        ),
        h(
          'div',
          { class: 'hero-grid' },
          ...owned.map((hero) =>
            rosterCard(hero, s.roster[hero.id]!, s.team.includes(hero.id), () => openDetail(hero.id)),
          ),
        ),
        locked.length > 0
          ? h('div', { class: 'section-title' }, `ยังไม่ได้ครอบครอง (${locked.length})`)
          : null,
        locked.length > 0
          ? h(
              'p',
              { class: 'tier-note' },
              'ระบบอัญเชิญฮีโร่จะเปิดใน Phase 5 (สุ่มฝั่ง server) — ตอนนี้ดูสเปกไว้วางแผนทีมได้ก่อน',
            )
          : null,
        locked.length > 0
          ? h(
              'div',
              { class: 'hero-grid' },
              ...locked.map((hero) =>
                h(
                  'div',
                  { class: 'hero-card locked', onclick: () => openDetail(hero.id) },
                  h('span', { class: 'rar' }, '★'.repeat(hero.rarity)),
                  h('span', { class: 'cost' }, String(hero.cost)),
                  h('img', { class: 'pic', src: portraitDataUrl(hero.sprite), alt: hero.name_th }),
                  h('div', { class: 'nm' }, hero.name_th),
                  h('div', { class: 'sub' }, h('span', {}, `${ELEMENT_TH[hero.element]} · ${CLASS_TH[hero.class]}`)),
                ),
              ),
            )
          : null,
        h('div', { class: 'sticky-actions' }, h('button', { class: 'ghost', onclick: onBack }, '← กลับ')),
      ),
    );
  };

  const openDetail = (heroId: string): void => {
    root.replaceChildren(heroDetail(heroId, render));
    root.scrollTop = 0;
  };

  render();
  return root;
}

/** หน้ารายละเอียด/อัพฮีโร่ 1 ตัว */
export function heroDetail(heroId: string, onBack: () => void): HTMLElement {
  const hero = getHero(heroId);
  const root = h('div', { class: 'screen-inner hero-detail' });

  const act = (run: () => ReturnType<typeof levelUpHero>): void => {
    const res = save.apply(run());
    // ต้อง render ก่อนค่อย toast — render() ล้างลูกทั้งหมดของ root ข้อความจะหายทันทีถ้าสลับลำดับ
    render();
    toast(root, res.ok ? res.log_th : res.reason_th);
  };

  const render = (): void => {
    const s = save.state;
    const hs = s.roster[heroId];
    const owned = hs !== undefined;
    const prog = hs
      ? { level: hs.level, star: hs.star, awakened: hs.awakened, skillLevels: hs.skillLevels }
      : { level: 1, star: naturalStar(hero) };
    const stats = heroStats(hero, prog);
    const cap = maxLevelForStar(prog.star ?? naturalStar(hero));
    const needExp = hs ? expToNextLevel(progression, hs.level) : 0;
    const expPct = hs && needExp > 0 ? Math.min(100, Math.round((hs.exp / needExp) * 100)) : 0;

    const nodes: (HTMLElement | null)[] = [
      h(
        'div',
        { class: 'hd-head' },
        h('img', { class: 'hd-pic', src: portraitDataUrl(hero.sprite), alt: hero.name_th }),
        h(
          'div',
          { class: 'hd-title' },
          h('h2', {}, hero.name_th),
          h(
            'div',
            { class: 'hd-star', html: starHtml(prog.star ?? hero.rarity, progression.star.maxStar) },
          ),
          h(
            'div',
            { class: 'hd-tags' },
            h('span', { class: 'el-dot', style: `background:${ELEMENT_COLOR[hero.element]}` }),
            h('span', {}, `${ELEMENT_TH[hero.element]} · ${CLASS_TH[hero.class]}`),
            h('span', {}, hero.pos === 'melee' ? 'ประชิด' : 'ระยะไกล'),
            h('span', {}, `แต้มวาง ${hero.cost}`),
            hs?.awakened ? h('span', { class: 'awk' }, `✦ ${hero.awakenName_th}`) : null,
          ),
          h('p', { class: 'lore' }, hero.lore_th),
        ),
      ),
      owned
        ? h(
            'div',
            { class: 'hd-level' },
            h('div', { class: 'row' }, h('b', {}, `Lv.${hs!.level} / ${cap}`), h('span', {}, `EXP ${hs!.exp.toLocaleString('th-TH')} / ${needExp.toLocaleString('th-TH')}`)),
            h('div', { class: 'bar' }, h('i', { style: `width:${expPct}%` })),
          )
        : null,
      h(
        'div',
        { class: 'stat-grid' },
        statBox('พลังชีวิต', stats.hp),
        statBox('พลังโจมตี', stats.atk),
        statBox('ป้องกัน', stats.def),
        statBox('ต้านเวท', `${Math.round(stats.mres * 100)}%`),
        statBox('ความเร็วโจมตี', `${stats.aspd.toFixed(2)}/วิ`),
        statBox('ระยะโจมตี', hero.range),
        statBox('บล็อค', hero.blockCount),
        statBox('ชนิดดาเมจ', hero.damageType === 'magic' ? 'เวท' : hero.damageType === 'true' ? 'ทะลุเกราะ' : 'กายภาพ'),
      ),
    ];

    if (owned) {
      const lvCost = levelUpCost(hs!);
      const stCost = starUpCost(hs!);
      const awCost = awakenCost(hero);
      const potions = s.materials['hero_exp_potion'] ?? 0;

      nodes.push(
        h('div', { class: 'section-title' }, 'อัพเกรด'),
        h(
          'div',
          { class: 'up-list' },
          upRow(
            'เลื่อนเลเวล',
            hs!.level >= cap ? `ถึงเพดานของ ${hs!.star} ดาวแล้ว` : `ต้องการ EXP ${needExp.toLocaleString('th-TH')} + ${costText(lvCost)}`,
            hs!.level >= cap ? null : 'อัพ ×1',
            () => act(() => levelUpHero(save.state, heroId, 1)),
            hs!.level >= cap ? null : 'อัพให้สุด',
            () => act(() => levelUpHero(save.state, heroId, 99)),
          ),
          upRow(
            'ใช้ยาเพิ่มประสบการณ์',
            `มีอยู่ ${potions} ขวด · ขวดละ ${progression.level.expPerPotion} EXP`,
            potions > 0 ? 'ใช้ 1 ขวด' : null,
            () => act(() => feedExpPotions(save.state, heroId, 1)),
            potions > 0 ? `ใช้ทั้งหมด (${potions})` : null,
            () => act(() => feedExpPotions(save.state, heroId, potions)),
          ),
          upRow(
            'เลื่อนดาว',
            hs!.star >= progression.star.maxStar
              ? 'ถึงดาวสูงสุดแล้ว'
              : `ต้องเต็มเลเวลก่อน · ${costText(stCost)} · สถิติ +${Math.round(progression.star.statBonusPerStar * 100)}% และเพดานเลเวลเป็น ${maxLevelForStar(hs!.star + 1)}`,
            hs!.star >= progression.star.maxStar ? null : 'เลื่อนดาว',
            () => act(() => starUpHero(save.state, heroId)),
          ),
          upRow(
            'ปลุกพลัง (Awaken)',
            hs!.awakened
              ? `ปลุกพลังแล้ว — ${hero.awakenName_th}`
              : `ต้องถึง ${progression.awaken.minStar} ดาว · ${costText(awCost)} · สถิติ +${Math.round(
                  progression.awaken.statBonus * 100,
                )}% และคูลดาวน์ท่าไม้ตาย −${Math.round(progression.awaken.ultCooldownCut * 100)}%`,
            hs!.awakened ? null : 'ปลุกพลัง',
            () => act(() => awakenHero(save.state, heroId)),
          ),
        ),
      );

      nodes.push(
        h('div', { class: 'section-title' }, 'สกิล'),
        h(
          'div',
          { class: 'up-list' },
          ...hero.skills.map((sid) => {
            const lv = hs!.skillLevels[sid] ?? 1;
            const base = getSkill(sid);
            const cur = skillFor(base, lv, hs!.awakened);
            const maxed = lv >= progression.skill.maxLevel;
            const kind = base.type === 'ultimate' ? 'ท่าไม้ตาย' : base.type === 'auto' ? 'อัตโนมัติ' : 'ติดตัว';
            const cd = cur.cooldownSec > 0 ? ` · คูลดาวน์ ${cur.cooldownSec.toFixed(1)} วิ` : '';
            return upRow(
              `${base.name_th}  ระดับ ${lv}/${progression.skill.maxLevel}`,
              `[${kind}] ${base.desc_th}${cd}`,
              maxed ? null : 'อัพสกิล',
              () => act(() => skillUpHero(save.state, heroId, sid)),
              undefined,
              undefined,
              maxed ? 'ระดับสูงสุด' : costText(skillUpCost(hs!, sid)),
            );
          }),
        ),
      );

      const inTeam = s.team.includes(heroId);
      nodes.push(
        h(
          'div',
          { class: 'sticky-actions' },
          h('button', { class: 'ghost', onclick: onBack }, '← คลังฮีโร่'),
          h(
            'button',
            {
              class: inTeam ? 'ghost' : 'primary',
              onclick: () => act(() => toggleTeamMember(save.state, heroId)),
            },
            inTeam ? 'ออกจากทีม' : 'เข้าทีม',
          ),
        ),
      );
    } else {
      nodes.push(
        h('p', { class: 'tier-note' }, 'ยังไม่มีฮีโร่ตัวนี้ในคลัง — ระบบอัญเชิญเปิดใน Phase 5'),
        h('div', { class: 'sticky-actions' }, h('button', { class: 'ghost', onclick: onBack }, '← คลังฮีโร่')),
      );
    }

    root.replaceChildren(walletBar(), ...nodes.filter((n): n is HTMLElement => n !== null));
  };

  render();
  return root;
}

function statBox(label: string, value: string | number): HTMLElement {
  return h('div', { class: 'stat-box' }, h('span', { class: 'k' }, label), h('span', { class: 'v' }, String(value)));
}

function upRow(
  title: string,
  note: string,
  action?: string | null,
  onAction?: () => void,
  action2?: string | null,
  onAction2?: () => void,
  costNote?: string,
): HTMLElement {
  return h(
    'div',
    { class: 'up-row' },
    h(
      'div',
      { class: 'up-text' },
      h('b', {}, title),
      h('span', {}, note),
      costNote ? h('span', { class: 'cost-note' }, costNote) : null,
    ),
    h(
      'div',
      { class: 'up-btns' },
      action ? h('button', { class: 'primary small', onclick: onAction }, action) : null,
      action2 ? h('button', { class: 'ghost small', onclick: onAction2 }, action2) : null,
    ),
  );
}
