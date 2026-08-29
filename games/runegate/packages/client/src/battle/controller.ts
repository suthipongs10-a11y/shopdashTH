import { getHero, getSkill, getTurret, getWeapon, TICK_DT, type Stage, type Turret } from '@runegate/data';
import { Battle, canDeployOn, effRange, isHero, isTurret, type HeroUnit } from '@runegate/sim';
import { StageScene, type DeployTile } from '../render/scene.js';
import { BattleView } from '../render/battleView.js';
import { portraitDataUrl } from '../render/sprites.js';
import { applyBattleRewards, type RewardSummary } from '@runegate/meta';
import { Rng } from '@runegate/sim';
import { h, starHtml, toast } from '../ui/common.js';
import { itemLabel } from '../ui/heroes.js';
import { save } from '../ui/save.js';

interface HeroBarEntry {
  heroId: string;
  btn: HTMLButtonElement;
  veil: HTMLDivElement;
}

/** ทีมที่ส่งเข้าด่าน (โครงเดียวกับ `SquadEntry` ของ sim) */
export type BattleSquadInput = {
  heroId: string;
  level: number;
  star?: number;
  awakened?: boolean;
  skillLevels?: Record<string, number>;
}[];

export interface BattleHandlers {
  onExit(): void;
  onRetry(): void;
}

export class BattleController {
  private readonly scene: StageScene;
  private readonly battle: Battle;
  private readonly view: BattleView;
  private readonly ui: HTMLElement;
  private raf = 0;
  private lastTime = 0;
  private acc = 0;
  private speed = 1;
  private paused = false;
  private ended = false;

  private selectedHeroId: string | null = null;
  private pendingTile: { x: number; y: number } | null = null;
  private selectedUid: number | null = null;

  private bar: HeroBarEntry[] = [];
  private dirpad: HTMLElement | null = null;
  private hint: HTMLElement | null = null;
  private selectedPad: { x: number; y: number } | null = null;
  private unitPanel: HTMLElement | null = null;
  private elWave!: HTMLElement;
  private elHp!: HTMLElement;
  private elCost!: HTMLElement;
  private elTime!: HTMLElement;
  private readonly seed: number;

  constructor(
    canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
    private readonly stage: Stage,
    squad: BattleSquadInput,
    private readonly handlers: BattleHandlers,
  ) {
    this.ui = uiRoot;
    this.scene = new StageScene(canvas, stage);
    this.seed = (Date.now() & 0x7fffffff) >>> 0;
    this.battle = new Battle({ stage, squad, seed: this.seed });
    this.view = new BattleView(this.scene, this.battle, this.ui);

    this.buildHud(squad.map((e) => e.heroId));
    this.attachInput(canvas);
    window.addEventListener('resize', this.onResize);
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------------------- HUD ---------------------------- */

  private buildHud(squad: string[]): void {
    this.elWave = h('span', { class: 'wave' }, 'เตรียมตัว');
    this.elHp = h('span', { class: 'pill hp' }, `ฐาน ${this.battle.baseHp}`);
    this.elCost = h('span', { class: 'pill cost' }, '0');
    this.elTime = h('span', { class: 'pill' }, '0:00');

    const speedBtn = h('button', { class: 'icon-btn', 'data-role': 'speed' }, '▶ 1x');
    speedBtn.addEventListener('click', () => {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      speedBtn.textContent = `▶ ${this.speed}x`;
    });
    const pauseBtn = h('button', { class: 'icon-btn', 'data-role': 'pause' }, '⏸');
    pauseBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      pauseBtn.textContent = this.paused ? '▶' : '⏸';
    });

    const topbar = h(
      'div',
      { class: 'topbar' },
      h('button', { class: 'icon-btn', 'data-role': 'back', onclick: () => this.exit() }, '←'),
      h('div', { class: 'titlebox' }, h('div', { class: 'title' }, this.stage.name_th), this.elWave),
      h('span', { class: 'spacer' }),
      this.elTime,
      this.elHp,
      speedBtn,
      pauseBtn,
    );

    const herobar = h('div', { class: 'herobar' });
    for (const heroId of squad) {
      const hero = getHero(heroId);
      const veil = h('div', { class: 'veil' }, '');
      veil.style.display = 'none';
      const btn = h(
        'button',
        { class: 'unit-btn', title: hero.name_th },
        h('span', { class: 'cost' }, String(hero.cost)),
        h('img', { src: portraitDataUrl(hero.sprite, 88), alt: hero.name_th }),
        h('div', { class: 'nm' }, hero.name_th),
        veil,
      ) as HTMLButtonElement;
      btn.addEventListener('click', () => this.selectHeroForDeploy(heroId));
      herobar.appendChild(btn);
      this.bar.push({ heroId, btn, veil });
    }

    this.ui.append(topbar, h('div', { class: 'costbar' }, this.elCost, h('span', { class: 'pill' }, 'แต้มวาง')), herobar);
  }

  /* --------------------------- อินพุต --------------------------- */

  private attachInput = (canvas: HTMLCanvasElement): void => {
    canvas.addEventListener('pointerup', (e) => {
      if (this.scene.dragDistance > 10) return; // ลากหมุนกล้อง ไม่ใช่การแตะ
      const tile = this.scene.pickTile(e.clientX, e.clientY);
      if (!tile) {
        this.cancelPlacement();
        this.closeUnitPanel();
        return;
      }
      this.onTapTile(tile.tx, tile.ty, e.clientX, e.clientY);
    });
    window.addEventListener('keydown', this.onKey);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.cancelPlacement();
      this.closeUnitPanel();
    }
    if (e.key === ' ') {
      e.preventDefault();
      this.paused = !this.paused;
    }
  };

  private onTapTile(tx: number, ty: number, clientX: number, clientY: number): void {
    if (this.selectedHeroId) {
      const check = this.battle.canDeploy(this.selectedHeroId, tx, ty);
      if (!check.ok) {
        toast(this.ui, check.reason_th ?? 'วางตรงนี้ไม่ได้');
        return;
      }
      this.pendingTile = { x: tx, y: ty };
      this.scene.showRangeRing(tx, ty, getHero(this.selectedHeroId).range);
      this.showDirPad(clientX, clientY);
      return;
    }
    const unit = this.battle.deployedHeroes.find((u) => u.tileX === tx && u.tileY === ty);
    if (unit) {
      this.openUnitPanel(unit.uid);
      return;
    }
    if (this.stage.tiles[ty]?.[tx] === 'T') {
      this.openBuildMenu(tx, ty);
      return;
    }
    this.closeUnitPanel();
  }

  private selectHeroForDeploy(heroId: string): void {
    this.closeUnitPanel();
    if (this.selectedHeroId === heroId) {
      this.cancelPlacement();
      return;
    }
    const first = this.battle.canDeploy(heroId, -1, -1);
    if (!first.ok && first.reason_th && !first.reason_th.includes('นอกสนาม')) {
      toast(this.ui, first.reason_th);
      return;
    }
    this.selectedHeroId = heroId;
    const hero = getHero(heroId);
    const tiles: DeployTile[] = [];
    for (let y = 0; y < this.stage.grid.h; y++) {
      for (let x = 0; x < this.stage.grid.w; x++) {
        const ch = this.stage.tiles[y]?.[x] ?? '.';
        if (!canDeployOn(ch, hero.pos)) continue;
        if (this.battle.deployedHeroes.some((u) => u.tileX === x && u.tileY === y)) continue;
        tiles.push({ x, y, kind: ch === 'R' ? 'block' : ch === 'H' ? 'high' : 'ground' });
      }
    }
    this.scene.showDeployTiles(tiles);
    this.showPlacementHint(hero.pos);
    for (const e of this.bar) e.btn.classList.toggle('active', e.heroId === heroId);
  }

  /** อธิบายความต่างของช่องแต่ละสี — กันผู้เล่นวางฮีโร่ประชิดข้างทางแล้วงงว่าทำไมไม่ตี */
  private showPlacementHint(pos: 'melee' | 'ranged'): void {
    this.hint?.remove();
    this.hint =
      pos === 'melee'
        ? h(
            'div',
            { class: 'place-hint' },
            h('span', {}, h('i', { class: 'sw block' }), 'บนทางเดิน = ', h('b', {}, 'ขวางศัตรูไว้'), ' (คุ้มที่สุด)'),
            h('span', {}, h('i', { class: 'sw ground' }), 'ข้างทาง = ตีศัตรูที่เดินผ่านได้ แต่ ', h('b', {}, 'ไม่ขวาง')),
          )
        : h(
            'div',
            { class: 'place-hint' },
            h('span', {}, h('i', { class: 'sw high' }), 'ที่สูงเท่านั้น — ยิงข้ามหัวได้ และตีศัตรูบินได้'),
          );
    this.ui.appendChild(this.hint);
  }

  private cancelPlacement(): void {
    this.selectedHeroId = null;
    this.pendingTile = null;
    this.scene.clearHighlights();
    this.scene.clearRangeRing();
    this.dirpad?.remove();
    this.dirpad = null;
    this.hint?.remove();
    this.hint = null;
    for (const e of this.bar) e.btn.classList.remove('active');
  }

  private showDirPad(clientX: number, clientY: number): void {
    this.dirpad?.remove();
    const mk = (cls: string, label: string, angle: number): HTMLElement =>
      h('button', { class: cls, onclick: () => this.confirmDeploy(angle) }, label);
    const pad = h(
      'div',
      { class: 'dirpad' },
      mk('up', '↑', Math.PI / 2),
      mk('right', '→', 0),
      mk('down', '↓', -Math.PI / 2),
      mk('left', '←', Math.PI),
      h('button', { class: 'mid', onclick: () => this.cancelPlacement() }, '✕'),
    );
    pad.style.left = `${clientX}px`;
    pad.style.top = `${clientY}px`;
    this.ui.appendChild(pad);
    this.dirpad = pad;
  }

  private confirmDeploy(facing: number): void {
    if (!this.selectedHeroId || !this.pendingTile) return;
    const res = this.battle.deploy(this.selectedHeroId, this.pendingTile.x, this.pendingTile.y, facing);
    if (!res.ok) toast(this.ui, res.reason_th ?? 'วางไม่สำเร็จ');
    this.cancelPlacement();
  }

  /* ------------------------ แผงฮีโร่ที่เลือก ------------------------ */

  private openUnitPanel(uid: number): void {
    this.selectedUid = uid;
    const u = this.battle.unit(uid);
    if (u && isHero(u)) this.scene.showRangeRing(u.tileX, u.tileY, effRange(u));
    this.renderUnitPanel();
  }

  /** แตะแท่นว่าง → เลือกเครื่องยิงที่จะสร้าง */
  private openBuildMenu(tileX: number, tileY: number): void {
    this.closeUnitPanel();
    this.cancelPlacement();
    this.selectedPad = { x: tileX, y: tileY };
    const options = this.battle.buildableTurrets.map((t) => this.turretOption(t, () => {
      const res = this.battle.build(t.id, tileX, tileY);
      if (!res.ok) toast(this.ui, res.reason_th ?? 'สร้างไม่สำเร็จ');
      this.closeUnitPanel();
      const built = this.battle.turretAt(tileX, tileY);
      if (built) this.openUnitPanel(built.uid);
    }));
    this.scene.showRangeRing(tileX, tileY, this.battle.buildableTurrets[0]?.range ?? 3);
    this.unitPanel?.remove();
    this.unitPanel = h(
      'div',
      { class: 'unitpanel buildmenu' },
      h('h4', {}, 'แท่นเครื่องยิง'),
      h('div', { class: 'sub' }, 'เครื่องยิงอัพเกรดต่อได้ระหว่างรบ และไม่กินโควตาช่องวางฮีโร่'),
      ...options,
      h('div', { class: 'btns' }, h('button', { onclick: () => this.closeUnitPanel() }, 'ปิด')),
    );
    this.ui.appendChild(this.unitPanel);
  }

  private turretOption(t: Turret, onclick: () => void): HTMLElement {
    const w = getWeapon(t.weapon);
    const affordable = this.battle.cost >= t.cost;
    return h(
      'button',
      { class: `turret-opt${affordable ? '' : ' poor'}`, onclick },
      h('span', { class: 'row' }, h('b', {}, t.name_th), h('span', { class: 'price' }, `${t.cost} แต้ม`)),
      h('span', { class: 'wname' }, `${w.name_th} · ระยะ ${t.range} · ${t.aspd.toFixed(2)} ครั้ง/วิ`),
      h('span', { class: 'wdesc' }, t.desc_th),
    );
  }

  private renderTurretPanel(u: HeroUnit): void {
    const def = u.def as Turret;
    const w = getWeapon(def.weapon);
    const report = this.battle.result().heroes.find((r) => r.uid === u.uid);
    const upgrades = def.upgradesTo.map((id) => getTurret(id));
    const panel = h(
      'div',
      { class: 'unitpanel' },
      h('h4', {}, `${def.name_th} · ขั้น ${def.tier}`),
      h('div', { class: 'sub' }, `${w.name_th} — ${w.desc_th}`),
      h('div', { class: 'stat' }, 'พลังโจมตี', h('b', {}, String(Math.round(u.base.atk)))),
      h('div', { class: 'stat' }, 'ระยะ / ความเร็ว', h('b', {}, `${def.range} · ${def.aspd.toFixed(2)}/วิ`)),
      h('div', { class: 'stat' }, 'ดาเมจสะสม', h('b', {}, (report?.damageDealt ?? 0).toLocaleString('th-TH'))),
      upgrades.length > 0 ? h('div', { class: 'up-title' }, 'อัพเกรดเป็น') : null,
      ...upgrades.map((t) =>
        this.turretOption(t, () => {
          const res = this.battle.upgrade(u.uid, t.id);
          if (!res.ok) {
            toast(this.ui, res.reason_th ?? 'อัพเกรดไม่สำเร็จ');
            return;
          }
          const next = this.battle.turretAt(u.tileX, u.tileY);
          this.closeUnitPanel();
          if (next) this.openUnitPanel(next.uid);
        }),
      ),
      h(
        'div',
        { class: 'btns' },
        h(
          'button',
          {
            onclick: () => {
              this.battle.sell(u.uid);
              this.closeUnitPanel();
            },
          },
          `🔨 รื้อ (คืน ${Math.floor(u.investedCost * this.stage.deploy.retreatRefund)})`,
        ),
      ),
    );
    this.unitPanel?.remove();
    this.unitPanel = panel;
    this.ui.appendChild(panel);
  }

  private closeUnitPanel(): void {
    this.selectedPad = null;
    this.selectedUid = null;
    this.unitPanel?.remove();
    this.unitPanel = null;
    this.scene.clearRangeRing();
  }

  private renderUnitPanel(): void {
    if (this.selectedUid === null) return;
    const u = this.battle.unit(this.selectedUid);
    if (!u || !isHero(u) || !u.alive) {
      this.closeUnitPanel();
      return;
    }
    const hero = u as HeroUnit;
    if (isTurret(hero)) {
      this.renderTurretPanel(hero);
      return;
    }
    const ultSkill = hero.skills.find((s) => s.def.type === 'ultimate');
    const ultReady = hero.hasUlt && hero.ultCd <= 0;

    const panel = h(
      'div',
      { class: 'unitpanel' },
      h('h4', {}, `${hero.name} · Lv.${hero.level}`),
      h('div', { class: 'sub' }, heroSubtitle(hero)),
      h('div', { class: 'bar' }, h('i', { style: `width:${(hero.hp / hero.maxHp) * 100}%` })),
      h('div', { class: 'stat' }, 'พลังชีวิต', h('b', {}, `${Math.ceil(hero.hp)} / ${hero.maxHp}`)),
      h('div', { class: 'stat' }, 'พลังโจมตี', h('b', {}, String(Math.round(hero.base.atk)))),
      h('div', { class: 'stat' }, 'บล็อค', h('b', {}, `${hero.blocking.length} / ${hero.blockCount}`)),
      ultSkill
        ? h('div', { class: 'stat' }, getSkill(ultSkill.def.id).name_th, h('b', {}, ultReady ? 'พร้อม!' : `${Math.ceil(hero.ultCd)} วิ`))
        : null,
      h(
        'div',
        { class: 'btns' },
        h(
          'button',
          {
            class: ultReady ? 'primary' : '',
            disabled: !ultReady,
            onclick: () => {
              const r = this.battle.useUltimate(hero.uid);
              if (!r.ok) toast(this.ui, r.reason_th ?? '');
              this.renderUnitPanel();
            },
          },
          '⚡ ท่าไม้ตาย',
        ),
        h(
          'button',
          {
            onclick: () => {
              this.battle.retreat(hero.uid);
              this.closeUnitPanel();
            },
          },
          '↩ ถอนกลับ',
        ),
      ),
    );
    this.unitPanel?.remove();
    this.unitPanel = panel;
    this.ui.appendChild(panel);
  }

  /* ---------------------------- ลูป ---------------------------- */

  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dtReal = Math.min((now - this.lastTime) / 1000, 0.12);
    this.lastTime = now;

    const running = !this.paused && this.battle.status === 'running';
    if (running) {
      this.acc += dtReal * this.speed;
      let steps = 0;
      while (this.acc >= TICK_DT && steps < 40) {
        this.battle.step();
        this.acc -= TICK_DT;
        steps++;
      }
    }

    this.view.handleEvents(this.battle.drainEvents());
    this.view.update(running ? dtReal * this.speed : 0);
    this.updateHud();
    this.scene.render();

    if (this.battle.status !== 'running' && !this.ended) {
      this.ended = true;
      this.showResult();
    }
  };

  private updateHud(): void {
    const cost = Math.floor(this.battle.cost);
    if (this.elCost.textContent !== String(cost)) this.elCost.textContent = String(cost);
    const hpText = `ฐาน ${this.battle.baseHp}/${this.battle.baseHpMax}`;
    if (this.elHp.textContent !== hpText) this.elHp.textContent = hpText;
    const t = Math.floor(this.battle.elapsedSec);
    const timeText = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    if (this.elTime.textContent !== timeText) this.elTime.textContent = timeText;
    const waveText = this.battle.currentWaveLabel
      ? `${this.battle.currentWaveLabel} · เหลือศัตรู ${this.battle.aliveEnemies.length}`
      : 'เตรียมตัว';
    if (this.elWave.textContent !== waveText) this.elWave.textContent = waveText;

    for (const entry of this.bar) {
      const onField = this.battle.deployedHeroes.some((u) => u.heroId === entry.heroId);
      const cd = this.battle.redeployRemainingSec(entry.heroId);
      const cheap = this.battle.cost >= this.battle.costOf(entry.heroId);
      let veil = '';
      if (onField) veil = '✔';
      else if (cd > 0) veil = String(Math.ceil(cd));
      else if (!cheap) veil = '···';
      if (entry.veil.textContent !== veil) entry.veil.textContent = veil;
      const show = veil !== '';
      entry.veil.style.display = show ? 'flex' : 'none';
      entry.btn.disabled = onField || cd > 0;
      if (entry.btn.disabled && this.selectedHeroId === entry.heroId) this.cancelPlacement();
    }

    if (this.selectedUid !== null) this.renderUnitPanel();
  }

  private showResult(): void {
    this.cancelPlacement();
    this.closeUnitPanel();
    const r = this.battle.result();
    // รางวัลคิดจากผลจริงของด่าน ผ่าน meta (pure) แล้วบันทึกลงเซฟจุดเดียว
    const { state, summary } = applyBattleRewards(save.state, this.stage, r, new Rng(this.seed ^ 0x9e3779b9));
    save.set(state);

    const rows: [string, string][] = [
      ['ศัตรูที่กำจัด', `${r.enemiesKilled} / ${r.enemiesTotal}`],
      ['ศัตรูที่หลุดเข้าฐาน', String(r.leaks)],
      ['เลือดฐานที่เหลือ', `${r.baseHp} / ${r.baseHpMax}`],
      ['เวลาที่ใช้', `${Math.floor(r.elapsedSec / 60)}:${String(Math.floor(r.elapsedSec % 60)).padStart(2, '0')}`],
      ['ฮีโร่ที่ใช้', `${r.heroesUsed} ตัว`],
    ];
    const top = [...r.heroes].sort((a, b) => b.damageDealt - a.damageDealt)[0];
    if (top) rows.push(['ดาเมจสูงสุด', `${top.name} (${top.damageDealt.toLocaleString('th-TH')})`]);

    const modal = h(
      'div',
      { class: 'modal-wrap' },
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, r.win ? 'ป้องกันสำเร็จ!' : 'ฐานแตก...'),
        h('div', { class: 'bigstars', html: starHtml(r.stars) }),
        rewardBlock(summary),
        h(
          'table',
          {},
          ...rows.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))),
        ),
        h(
          'div',
          { class: 'btns' },
          h('button', { class: 'ghost', onclick: () => this.exit() }, 'กลับหน้าเลือกด่าน'),
          h('button', { class: 'primary', onclick: () => this.retry() }, 'เล่นอีกครั้ง'),
        ),
      ),
    );
    this.ui.appendChild(modal);
  }

  private onResize = (): void => this.scene.resize();

  private retry(): void {
    this.destroy();
    this.handlers.onRetry();
  }

  private exit(): void {
    this.destroy();
    this.handlers.onExit();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    this.view.dispose();
    this.scene.dispose();
    this.ui.replaceChildren();
  }
}


function heroSubtitle(u: HeroUnit): string {
  const def = u.def as { awakenName_th?: string; lore_th?: string; desc_th?: string };
  if (def.awakenName_th) return `${def.awakenName_th} — ${def.lore_th ?? ''}`;
  return def.desc_th ?? '';
}

/** กล่องสรุปของรางวัลหลังจบด่าน */
function rewardBlock(summary: RewardSummary): HTMLElement {
  const chips: HTMLElement[] = [
    h('span', { class: 'chip gain' }, `🪙 +${summary.gold.toLocaleString('th-TH')}`),
  ];
  if (summary.gems > 0) chips.push(h('span', { class: 'chip gain' }, `💎 +${summary.gems} (เคลียร์ครั้งแรก)`));
  if (summary.exp > 0) chips.push(h('span', { class: 'chip gain' }, `EXP +${summary.exp.toLocaleString('th-TH')}`));
  for (const [item, n] of Object.entries(summary.items)) {
    chips.push(h('span', { class: 'chip gain' }, `${itemLabel(item)} ×${n}`));
  }
  return h('div', { class: 'reward-block' }, h('b', {}, 'ของที่ได้รับ'), h('div', { class: 'chips' }, ...chips));
}
