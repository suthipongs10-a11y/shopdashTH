import { getHero, getSkill, TICK_DT, type Stage } from '@runegate/data';
import { Battle, canDeployOn, effRange, isHero, type HeroUnit } from '@runegate/sim';
import { StageScene, type DeployTile } from '../render/scene.js';
import { BattleView } from '../render/battleView.js';
import { portraitDataUrl } from '../render/sprites.js';
import { h, progress, starHtml, toast } from '../ui/common.js';

interface HeroBarEntry {
  heroId: string;
  btn: HTMLButtonElement;
  veil: HTMLDivElement;
}

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
  private unitPanel: HTMLElement | null = null;
  private elWave!: HTMLElement;
  private elHp!: HTMLElement;
  private elCost!: HTMLElement;
  private elTime!: HTMLElement;

  constructor(
    canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
    private readonly stage: Stage,
    squad: string[],
    level: number,
    private readonly handlers: BattleHandlers,
  ) {
    this.ui = uiRoot;
    this.scene = new StageScene(canvas, stage);
    this.battle = new Battle({
      stage,
      squad: squad.map((heroId) => ({ heroId, level })),
      seed: (Date.now() & 0x7fffffff) >>> 0,
    });
    this.view = new BattleView(this.scene, this.battle, this.ui);

    this.buildHud(squad);
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
    const hero = this.battle.deployedHeroes.find((u) => u.tileX === tx && u.tileY === ty);
    if (hero) this.openUnitPanel(hero.uid);
    else this.closeUnitPanel();
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

  private closeUnitPanel(): void {
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
    const ultSkill = hero.skills.find((s) => s.def.type === 'ultimate');
    const ultReady = hero.hasUlt && hero.ultCd <= 0;

    const panel = h(
      'div',
      { class: 'unitpanel' },
      h('h4', {}, `${hero.name} · Lv.${hero.level}`),
      h('div', { class: 'sub' }, `${hero.def.awakenName_th} — ${hero.def.lore_th}`),
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
    progress.recordStars(this.stage.id, r.stars);

    const rows: [string, string][] = [
      ['ศัตรูที่กำจัด', `${r.enemiesKilled} / ${r.enemiesTotal}`],
      ['ศัตรูที่หลุดเข้าฐาน', String(r.leaks)],
      ['เลือดฐานที่เหลือ', `${r.baseHp} / ${r.baseHpMax}`],
      ['เวลาที่ใช้', `${Math.floor(r.elapsedSec / 60)}:${String(Math.floor(r.elapsedSec % 60)).padStart(2, '0')}`],
      ['ฮีโร่ที่ใช้', `${r.heroesUsed} ตัว`],
      ['ทองที่ได้', String(r.goldEarned)],
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
