import {
  getEnemy,
  getHero,
  getSkill,
  heroStatsAtLevel,
  TICK_DT,
  TICKS_PER_SEC,
  type Effect,
  type Element,
  type Race,
  type Skill,
  type Stage,
  type StarCondition,
  type StatusKind,
} from '@runegate/data';

import { computeDamage } from './damage.js';
import { buildPaths, canDeployOn, dist2, tileOf, type PathTrack } from './path.js';
import { Rng } from './rng.js';
import { effAspd, effAtk, effMoveSpeed, effRange, isRooted, isStunned } from './stats.js';
import {
  isEnemy,
  isHero,
  type BattleEvent,
  type BattleResult,
  type BattleStatus,
  type Command,
  type EnemyUnit,
  type HeroReport,
  type HeroUnit,
  type Unit,
} from './types.js';

export interface SquadEntry {
  heroId: string;
  level: number;
  /** โบนัสจากการ์ด/รูนที่ติดตั้งไว้นอกด่าน (Phase 6) — sim รับเป็น input เท่านั้น */
  raceBonus?: Partial<Record<Race, number>>;
  elementBonus?: Partial<Record<Element, number>>;
}

export interface BattleOptions {
  stage: Stage;
  squad: SquadEntry[];
  seed: number;
  /** ตัดจบถ้าเกินเวลานี้ (กันด่านค้างตอนรันจำลอง) */
  maxSeconds?: number;
  /** ปิดการเก็บ event เพื่อความเร็วตอนรัน balance 1,000 ด่าน */
  recordEvents?: boolean;
}

export interface DeployCheck {
  ok: boolean;
  reason_th?: string;
}

interface SpawnEntry {
  timeSec: number;
  enemyId: string;
  path: string;
  hpMult: number;
  atkMult: number;
  waveId: string;
  waveLabel: string;
  /** ลำดับที่เขียนไว้ในไฟล์ด่าน — ใช้ตัดสินเมื่อเวลาเกิดเท่ากันเป๊ะ */
  order: number;
}

const MAX_COST = 99;

export class Battle {
  readonly stage: Stage;
  readonly squad: SquadEntry[];
  readonly rng: Rng;
  readonly paths: Map<string, PathTrack>;
  readonly maxTicks: number;
  readonly recordEvents: boolean;

  units: Unit[] = [];
  tick = 0;
  baseHp: number;
  readonly baseHpMax: number;
  cost: number;
  status: BattleStatus = 'running';
  events: BattleEvent[] = [];

  leaks = 0;
  enemiesKilled = 0;
  ultimatesUsed = 0;
  goldEarned = 0;
  expEarned = 0;
  healedTotal = new Map<number, number>();
  currentWaveLabel = '';

  private nextUid = 1;
  private summonedTotal = 0;
  private spawnQueue: SpawnEntry[];
  private spawnIndex = 0;
  private redeployReadyTick = new Map<string, number>();
  private heroesEverDeployed = new Set<string>();
  private announcedWaves = new Set<string>();
  private heroReports = new Map<number, HeroReport>();

  constructor(opts: BattleOptions) {
    this.stage = opts.stage;
    this.squad = opts.squad;
    this.rng = new Rng(opts.seed);
    this.paths = buildPaths(opts.stage);
    this.baseHp = opts.stage.baseHp;
    this.baseHpMax = opts.stage.baseHp;
    this.cost = opts.stage.deploy.initialCost;
    this.maxTicks = Math.round((opts.maxSeconds ?? 900) * TICKS_PER_SEC);
    this.recordEvents = opts.recordEvents ?? true;
    this.spawnQueue = buildSpawnQueue(opts.stage);
  }

  get elapsedSec(): number {
    return this.tick * TICK_DT;
  }

  get enemiesTotal(): number {
    return this.spawnQueue.length + this.summonedTotal;
  }

  get deployedHeroes(): HeroUnit[] {
    return this.units.filter((u): u is HeroUnit => isHero(u) && u.alive);
  }

  get aliveEnemies(): EnemyUnit[] {
    return this.units.filter((u): u is EnemyUnit => isEnemy(u) && u.alive);
  }

  unit(uid: number): Unit | undefined {
    return this.units.find((u) => u.uid === uid);
  }

  drainEvents(): BattleEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private emit(e: BattleEvent): void {
    if (this.recordEvents) this.events.push(e);
  }

  /* ---------------------------------------------------------------- */
  /* คำสั่งผู้เล่น                                                      */
  /* ---------------------------------------------------------------- */

  /** ค่า Deploy Cost จริงของฮีโร่ (เผื่อรูน Tactic ลด cost ใน Phase 6) */
  costOf(heroId: string): number {
    return getHero(heroId).cost;
  }

  redeployRemainingSec(heroId: string): number {
    const ready = this.redeployReadyTick.get(heroId);
    if (ready === undefined) return 0;
    return Math.max(0, (ready - this.tick) * TICK_DT);
  }

  canDeploy(heroId: string, tileX: number, tileY: number): DeployCheck {
    const entry = this.squad.find((s) => s.heroId === heroId);
    if (!entry) return { ok: false, reason_th: 'ฮีโร่ตัวนี้ไม่ได้อยู่ในทีม' };
    const hero = getHero(heroId);
    if (this.deployedHeroes.some((h) => h.heroId === heroId)) {
      return { ok: false, reason_th: 'ฮีโร่ตัวนี้อยู่ในสนามแล้ว' };
    }
    const wait = this.redeployRemainingSec(heroId);
    if (wait > 0) return { ok: false, reason_th: `รอคูลดาวน์อีก ${Math.ceil(wait)} วินาที` };
    if (this.cost < hero.cost) return { ok: false, reason_th: 'แต้มวางไม่พอ' };
    if (this.deployedHeroes.length >= this.stage.deploy.deployLimit) {
      return { ok: false, reason_th: `วางได้สูงสุด ${this.stage.deploy.deployLimit} ตัวพร้อมกัน` };
    }
    if (tileX < 0 || tileY < 0 || tileX >= this.stage.grid.w || tileY >= this.stage.grid.h) {
      return { ok: false, reason_th: 'ตำแหน่งอยู่นอกสนาม' };
    }
    const tile = tileOf(this.stage, tileX, tileY);
    if (!canDeployOn(tile, hero.pos)) {
      return {
        ok: false,
        reason_th: hero.pos === 'melee' ? 'ฮีโร่ระยะประชิดต้องวางบนพื้น (ทางเดินหรือพื้นราบ)' : 'ฮีโร่ระยะไกลต้องวางบนที่สูง',
      };
    }
    if (this.deployedHeroes.some((h) => h.tileX === tileX && h.tileY === tileY)) {
      return { ok: false, reason_th: 'ช่องนี้มีฮีโร่อยู่แล้ว' };
    }
    return { ok: true };
  }

  deploy(heroId: string, tileX: number, tileY: number, facing = 0): DeployCheck {
    const check = this.canDeploy(heroId, tileX, tileY);
    if (!check.ok) return check;
    const entry = this.squad.find((s) => s.heroId === heroId)!;
    const hero = getHero(heroId);
    const stats = heroStatsAtLevel(hero, entry.level);

    const u: HeroUnit = {
      uid: this.nextUid++,
      faction: 'hero',
      heroId,
      def: hero,
      level: entry.level,
      name: hero.name_th,
      element: hero.element,
      pos: hero.pos,
      tileX,
      tileY,
      x: tileX + 0.5,
      y: tileY + 0.5,
      facing,
      hp: stats.hp,
      maxHp: stats.hp,
      base: {
        atk: stats.atk,
        def: stats.def,
        mres: stats.mres,
        aspd: stats.aspd,
        range: hero.range,
        critRate: stats.critRate,
        critDmg: stats.critDmg,
      },
      damageType: hero.damageType,
      statuses: [],
      mods: [],
      skills: hero.skills.map((id) => ({ def: getSkill(id), cd: 0 })),
      attackCd: 0,
      alive: true,
      blockCount: hero.blockCount,
      blocking: [],
      cost: hero.cost,
      windup: hero.deployWindupSec,
      ultCd: 0,
      ultMaxCd: 0,
      hasUlt: false,
      antiAir: 0,
      revealAura: 0,
      lifesteal: 0,
      splash: null,
      costRate: 0,
      raceBonus: { ...(entry.raceBonus ?? {}) },
      elementBonus: { ...(entry.elementBonus ?? {}) },
      targetUid: null,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deployedAtTick: this.tick,
    };

    this.applyPassives(u);

    for (const rs of u.skills) {
      if (rs.def.type === 'ultimate') {
        u.hasUlt = true;
        u.ultMaxCd = rs.def.cooldownSec;
        u.ultCd = rs.def.initialCooldownSec;
      } else if (rs.def.trigger === 'interval') {
        rs.cd = rs.def.initialCooldownSec;
      }
    }

    this.cost -= hero.cost;
    this.units.push(u);
    this.heroesEverDeployed.add(heroId);
    this.heroReports.set(u.uid, {
      uid: u.uid,
      heroId,
      name: hero.name_th,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      healed: 0,
      alive: true,
    });
    this.emit({ t: 'deploy', uid: u.uid, heroId, tileX, tileY });

    for (const rs of u.skills) {
      if (rs.def.trigger === 'on_deploy') this.castSkill(u, rs.def);
    }
    return { ok: true };
  }

  /** ใส่ผลของสกิล passive ตอนวาง (stat ถาวร, trait, splash, อัตรางอก cost) */
  private applyPassives(u: HeroUnit): void {
    let hpMult = 1;
    let hpAdd = 0;
    for (const rs of u.skills) {
      if (rs.def.trigger !== 'passive') continue;
      for (const e of rs.def.effects) {
        switch (e.kind) {
          case 'stat_mod':
            if (e.stat === 'hp') {
              hpMult *= e.mult;
              hpAdd += e.add;
            } else if (e.stat === 'block') {
              u.blockCount = Math.max(0, Math.round((u.blockCount + e.add) * e.mult));
            } else {
              u.mods.push({ stat: e.stat, mult: e.mult, add: e.add, remaining: Infinity });
            }
            break;
          case 'trait':
            if (e.trait === 'anti_air') u.antiAir += e.value;
            else if (e.trait === 'reveal_aura') u.revealAura = Math.max(u.revealAura, e.value);
            else if (e.trait === 'lifesteal') u.lifesteal += e.value;
            break;
          case 'splash_on_hit':
            u.splash = { radius: e.radius, ratio: e.ratio };
            break;
          case 'cost_rate':
            u.costRate += e.perSec;
            break;
          default:
            break;
        }
      }
    }
    if (hpMult !== 1 || hpAdd !== 0) {
      u.maxHp = Math.round((u.maxHp + hpAdd) * hpMult);
      u.hp = u.maxHp;
    }
  }

  retreat(uid: number): DeployCheck {
    const u = this.unit(uid);
    if (!u || !isHero(u) || !u.alive) return { ok: false, reason_th: 'ไม่พบฮีโร่ตัวนี้ในสนาม' };
    this.cost = Math.min(MAX_COST, this.cost + Math.floor(u.cost * this.stage.deploy.retreatRefund));
    this.removeHero(u, 'retreat');
    return { ok: true };
  }

  useUltimate(uid: number): DeployCheck {
    const u = this.unit(uid);
    if (!u || !isHero(u) || !u.alive) return { ok: false, reason_th: 'ไม่พบฮีโร่ตัวนี้ในสนาม' };
    if (!u.hasUlt) return { ok: false, reason_th: 'ฮีโร่ตัวนี้ไม่มีท่าไม้ตาย' };
    if (u.ultCd > 0) return { ok: false, reason_th: `ท่าไม้ตายยังไม่พร้อม (อีก ${Math.ceil(u.ultCd)} วินาที)` };
    const rs = u.skills.find((s) => s.def.type === 'ultimate');
    if (!rs) return { ok: false, reason_th: 'ฮีโร่ตัวนี้ไม่มีท่าไม้ตาย' };
    this.castSkill(u, rs.def);
    u.ultCd = rs.def.cooldownSec;
    this.ultimatesUsed++;
    return { ok: true };
  }

  applyCommand(cmd: Command): DeployCheck {
    switch (cmd.type) {
      case 'deploy':
        return this.deploy(cmd.heroId, cmd.tileX, cmd.tileY, cmd.facing);
      case 'retreat':
        return this.retreat(cmd.uid);
      case 'ultimate':
        return this.useUltimate(cmd.uid);
    }
  }

  /* ---------------------------------------------------------------- */
  /* ลูปหลัก                                                           */
  /* ---------------------------------------------------------------- */

  step(): void {
    if (this.status !== 'running') return;
    this.tick++;
    const dt = TICK_DT;

    this.growCost(dt);
    this.tickTimers(dt);
    this.spawnDue();

    for (const u of this.units) {
      if (!u.alive) continue;
      if (isHero(u)) this.updateHero(u, dt);
    }
    for (const u of this.units) {
      if (!u.alive) continue;
      if (isEnemy(u)) this.updateEnemy(u, dt);
    }

    this.cleanup();
    this.checkEnd();
  }

  private growCost(dt: number): void {
    let rate = this.stage.deploy.costPerSec;
    for (const u of this.units) {
      if (u.alive && isHero(u)) rate += u.costRate;
    }
    this.cost = Math.min(MAX_COST, this.cost + rate * dt);
  }

  private tickTimers(dt: number): void {
    for (const u of this.units) {
      if (!u.alive) continue;
      for (let i = u.statuses.length - 1; i >= 0; i--) {
        const s = u.statuses[i]!;
        if (s.kind === 'poison') {
          this.applyDamage(u, s.value * dt, this.unit(s.sourceUid) ?? null, false);
        }
        s.remaining -= dt;
        if (s.remaining <= 0 || (s.kind === 'shield' && s.value <= 0)) u.statuses.splice(i, 1);
      }
      for (let i = u.mods.length - 1; i >= 0; i--) {
        const m = u.mods[i]!;
        if (m.remaining === Infinity) continue;
        m.remaining -= dt;
        if (m.remaining <= 0) u.mods.splice(i, 1);
      }
      if (u.attackCd > 0) u.attackCd -= dt;
      for (const rs of u.skills) if (rs.cd > 0) rs.cd -= dt;
      if (isHero(u)) {
        if (u.windup > 0) u.windup -= dt;
        if (u.ultCd > 0) u.ultCd -= dt;
      }
    }
  }

  private spawnDue(): void {
    const now = this.elapsedSec;
    while (this.spawnIndex < this.spawnQueue.length && this.spawnQueue[this.spawnIndex]!.timeSec <= now) {
      const e = this.spawnQueue[this.spawnIndex]!;
      this.spawnIndex++;
      if (!this.announcedWaves.has(e.waveId)) {
        this.announcedWaves.add(e.waveId);
        this.currentWaveLabel = e.waveLabel;
        this.emit({ t: 'wave', waveId: e.waveId, label: e.waveLabel });
      }
      this.spawnEnemy(e);
    }
  }

  private spawnEnemy(entry: SpawnEntry, atDist = 0): void {
    const def = getEnemy(entry.enemyId);
    const track = this.paths.get(entry.path);
    if (!track) throw new Error(`ด่าน ${this.stage.id} ไม่มีเส้นทาง "${entry.path}"`);
    const startDist = Math.max(0, Math.min(atDist, track.length - 0.1));
    const p = track.at(startDist);
    const hp = Math.round(def.hp * entry.hpMult);
    const u: EnemyUnit = {
      uid: this.nextUid++,
      faction: 'enemy',
      enemyId: def.id,
      def,
      name: def.name_th,
      element: def.element,
      race: def.race,
      traits: [...def.traits],
      pathId: entry.path,
      dist: startDist,
      x: p.x,
      y: p.y,
      hp,
      maxHp: hp,
      base: {
        atk: def.atk * entry.atkMult,
        def: def.def,
        mres: def.mres,
        aspd: def.aspd,
        range: def.range,
        critRate: 0.03,
        critDmg: 1.5,
      },
      damageType: def.damageType,
      moveSpeed: def.moveSpeed,
      blockWeight: def.blockWeight,
      leakDamage: def.leakDamage,
      blockedBy: null,
      bountyGold: def.bounty.gold,
      bountyExp: def.bounty.exp,
      statuses: [],
      mods: [],
      skills: def.skills.map((id) => ({ def: getSkill(id), cd: 0 })),
      attackCd: 0,
      alive: true,
      targetUid: null,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
    };
    for (const rs of u.skills) {
      if (rs.def.trigger === 'passive') this.castSkill(u, rs.def);
      else if (rs.def.trigger === 'interval') rs.cd = rs.def.initialCooldownSec;
    }
    this.units.push(u);
    this.emit({ t: 'spawn', uid: u.uid, enemyId: def.id });
  }

  /* ---------------------------------------------------------------- */
  /* ฮีโร่                                                             */
  /* ---------------------------------------------------------------- */

  private updateHero(u: HeroUnit, _dt: number): void {
    if (isStunned(u)) return;
    if (u.windup > 0) return;

    const target = this.pickHeroTarget(u);
    u.targetUid = target?.uid ?? null;

    for (const rs of u.skills) {
      if (rs.def.trigger !== 'interval' || rs.cd > 0) continue;
      const fired = this.castSkill(u, rs.def);
      rs.cd = fired ? rs.def.cooldownSec : 0.3;
    }

    if (!target) return;
    if (u.attackCd > 0) return;
    u.attackCd = 1 / effAspd(u);
    this.performAttack(u, target);
  }

  private isTargetable(hero: HeroUnit, e: EnemyUnit): boolean {
    if (!e.alive) return false;
    if (e.traits.includes('flying') && hero.pos === 'melee') return false;
    if (e.traits.includes('stealth') && !this.isRevealed(e)) return false;
    return true;
  }

  /** ศัตรูล่องหนถูกเปิดเมื่อ: ติดสถานะ revealed / ถูกบล็อคอยู่ / อยู่ในรัศมี reveal ของฮีโร่ */
  isRevealed(e: EnemyUnit): boolean {
    if (e.blockedBy !== null) return true;
    for (const s of e.statuses) if (s.kind === 'revealed') return true;
    for (const u of this.units) {
      if (!u.alive || !isHero(u) || u.revealAura <= 0) continue;
      if (dist2(u.x, u.y, e.x, e.y) <= u.revealAura * u.revealAura) return true;
    }
    return false;
  }

  private pickHeroTarget(u: HeroUnit): EnemyUnit | null {
    const range = effRange(u);
    const r2 = range * range;
    let pool: EnemyUnit[] = [];

    // ตัวที่บล็อคอยู่มาก่อนเสมอ (tank ต้องตีตัวที่ตัวเองขวางไว้)
    if (u.blocking.length > 0) {
      for (const uid of u.blocking) {
        const e = this.unit(uid);
        if (e && isEnemy(e) && e.alive && this.isTargetable(u, e)) pool.push(e);
      }
    }
    if (pool.length === 0) {
      for (const e of this.units) {
        if (!isEnemy(e) || !e.alive) continue;
        if (dist2(u.x, u.y, e.x, e.y) > r2) continue;
        if (!this.isTargetable(u, e)) continue;
        pool.push(e);
      }
    }
    if (pool.length === 0) return null;

    const score = (e: EnemyUnit): number => {
      switch (u.def.targetPriority) {
        case 'first':
          return e.dist;
        case 'last':
          return -e.dist;
        case 'nearest':
          return -dist2(u.x, u.y, e.x, e.y);
        case 'lowest_hp':
          return -e.hp;
        case 'highest_hp':
          return e.hp;
        case 'flying_first':
          return (e.traits.includes('flying') ? 1e6 : 0) + e.dist;
        case 'elite_first':
          return (e.traits.includes('boss') ? 2e6 : e.traits.includes('elite') ? 1e6 : 0) + e.dist;
        case 'healer_first':
          return (e.traits.includes('healer') ? 1e6 : 0) + e.dist;
      }
    };
    let best = pool[0]!;
    let bestScore = score(best);
    for (let i = 1; i < pool.length; i++) {
      const s = score(pool[i]!);
      if (s > bestScore) {
        best = pool[i]!;
        bestScore = s;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- */
  /* ศัตรู                                                             */
  /* ---------------------------------------------------------------- */

  private updateEnemy(u: EnemyUnit, dt: number): void {
    // ตรวจสถานะการถูกบล็อค
    if (u.blockedBy !== null) {
      const blocker = this.unit(u.blockedBy);
      if (!blocker || !isHero(blocker) || !blocker.alive) u.blockedBy = null;
    }
    if (u.blockedBy === null && !u.traits.includes('flying')) {
      const tx = Math.floor(u.x);
      const ty = Math.floor(u.y);
      for (const h of this.units) {
        if (!isHero(h) || !h.alive || h.blockCount <= 0) continue;
        if (h.tileX !== tx || h.tileY !== ty) continue;
        const used = h.blocking.reduce((sum, uid) => {
          const e = this.unit(uid);
          return sum + (e && isEnemy(e) && e.alive ? e.blockWeight : 0);
        }, 0);
        if (used + u.blockWeight > h.blockCount) continue;
        u.blockedBy = h.uid;
        h.blocking.push(u.uid);
        break;
      }
    }

    if (isStunned(u)) return;

    // สกิลของศัตรู
    for (const rs of u.skills) {
      if (rs.def.trigger !== 'interval' || rs.cd > 0) continue;
      const fired = this.castSkill(u, rs.def);
      rs.cd = fired ? rs.def.cooldownSec : 0.3;
    }

    // เป้าหมาย: ตัวที่บล็อคเราไว้ก่อน ไม่งั้นเอาฮีโร่ที่ใกล้สุดในระยะ
    let target: HeroUnit | null = null;
    if (u.blockedBy !== null) {
      const b = this.unit(u.blockedBy);
      if (b && isHero(b) && b.alive) target = b;
    }
    if (!target) {
      const r2 = effRange(u) ** 2;
      let bestD = Infinity;
      for (const h of this.units) {
        if (!isHero(h) || !h.alive) continue;
        const d = dist2(u.x, u.y, h.x, h.y);
        if (d <= r2 && d < bestD) {
          bestD = d;
          target = h;
        }
      }
    }
    u.targetUid = target?.uid ?? null;

    if (target && u.attackCd <= 0) {
      u.attackCd = 1 / effAspd(u);
      this.performAttack(u, target);
    }

    if (u.blockedBy !== null || isRooted(u)) return;

    const track = this.paths.get(u.pathId)!;
    u.dist += effMoveSpeed(u.moveSpeed, u) * dt;
    if (u.dist >= track.length) {
      this.leak(u);
      return;
    }
    const p = track.at(u.dist);
    u.x = p.x;
    u.y = p.y;
  }

  private leak(e: EnemyUnit): void {
    this.leaks++;
    this.baseHp -= e.leakDamage;
    this.emit({ t: 'leak', uid: e.uid, damage: e.leakDamage });
    this.killUnit(e, null, true);
  }

  /* ---------------------------------------------------------------- */
  /* การโจมตี / ความเสียหาย                                            */
  /* ---------------------------------------------------------------- */

  private performAttack(attacker: Unit, target: Unit): void {
    const out = computeDamage(attacker, target, { ratio: 1 }, this.rng);
    this.applyDamage(target, out.amount, attacker, true);
    this.emit({
      t: 'hit',
      from: attacker.uid,
      to: target.uid,
      amount: out.amount,
      crit: out.crit,
      kind: attacker.damageType,
      matchup: out.matchup,
    });

    if (isHero(attacker)) {
      if (attacker.lifesteal > 0) this.heal(attacker, out.amount * attacker.lifesteal, attacker);
      if (attacker.splash && isEnemy(target)) {
        const r2 = attacker.splash.radius ** 2;
        for (const e of this.units) {
          if (!isEnemy(e) || !e.alive || e.uid === target.uid) continue;
          if (dist2(target.x, target.y, e.x, e.y) > r2) continue;
          if (!this.isTargetable(attacker, e)) continue;
          const s = computeDamage(attacker, e, { ratio: attacker.splash.ratio, canCrit: false }, this.rng);
          this.applyDamage(e, s.amount, attacker, true);
        }
      }
    }

    for (const rs of attacker.skills) {
      if (rs.def.trigger !== 'on_attack') continue;
      if (!this.rng.chance(rs.def.chance)) continue;
      this.castSkill(attacker, rs.def, target);
    }
  }

  applyDamage(target: Unit, amount: number, source: Unit | null, countStats: boolean): void {
    if (!target.alive || amount <= 0) return;
    let remaining = amount;
    for (const s of target.statuses) {
      if (s.kind !== 'shield' || s.value <= 0) continue;
      const absorbed = Math.min(s.value, remaining);
      s.value -= absorbed;
      remaining -= absorbed;
      if (remaining <= 0) break;
    }
    if (remaining <= 0) return;

    target.hp -= remaining;
    target.damageTaken += remaining;
    if (source && countStats) {
      source.damageDealt += remaining;
      const rep = this.heroReports.get(source.uid);
      if (rep) rep.damageDealt += remaining;
    }
    const trep = this.heroReports.get(target.uid);
    if (trep) trep.damageTaken += remaining;

    if (target.hp <= 0) this.killUnit(target, source, false);
  }

  private heal(target: Unit, amount: number, source: Unit | null): void {
    if (!target.alive || amount <= 0) return;
    const healed = Math.min(amount, target.maxHp - target.hp);
    if (healed <= 0) return;
    target.hp += healed;
    if (source) {
      const rep = this.heroReports.get(source.uid);
      if (rep) rep.healed += healed;
      this.healedTotal.set(source.uid, (this.healedTotal.get(source.uid) ?? 0) + healed);
    }
    this.emit({ t: 'heal', from: source?.uid ?? 0, to: target.uid, amount: Math.round(healed) });
  }

  private killUnit(u: Unit, killer: Unit | null, leaked: boolean): void {
    if (!u.alive) return;
    u.alive = false;
    if (isEnemy(u)) {
      if (u.blockedBy !== null) {
        const b = this.unit(u.blockedBy);
        if (b && isHero(b)) b.blocking = b.blocking.filter((id) => id !== u.uid);
        u.blockedBy = null;
      }
      if (!leaked) {
        this.enemiesKilled++;
        this.goldEarned += u.bountyGold;
        this.expEarned += u.bountyExp;
        if (killer) {
          killer.kills++;
          const rep = this.heroReports.get(killer.uid);
          if (rep) rep.kills++;
        }
        this.emit({ t: 'death', uid: u.uid, faction: 'enemy' });
      }
    } else {
      this.removeHero(u, 'death');
    }
  }

  private removeHero(u: HeroUnit, cause: 'death' | 'retreat'): void {
    u.alive = false;
    for (const uid of u.blocking) {
      const e = this.unit(uid);
      if (e && isEnemy(e)) e.blockedBy = null;
    }
    u.blocking = [];
    const rep = this.heroReports.get(u.uid);
    if (rep) rep.alive = false;
    this.redeployReadyTick.set(u.heroId, this.tick + Math.round(u.def.redeployCooldownSec * TICKS_PER_SEC));
    if (cause === 'death') this.emit({ t: 'death', uid: u.uid, faction: 'hero' });
    else this.emit({ t: 'retreat', uid: u.uid });
  }

  /* ---------------------------------------------------------------- */
  /* สกิล                                                              */
  /* ---------------------------------------------------------------- */

  /** คืน false เมื่อไม่มีเป้าหมายให้ทำงาน (ผู้เรียกจะไม่กิน cooldown เต็ม) */
  castSkill(caster: Unit, skill: Skill, forcedTarget?: Unit): boolean {
    let didSomething = false;
    for (const effect of skill.effects) {
      const targets = this.resolveTargets(caster, effect, forcedTarget);
      if (targets.length === 0) continue;
      didSomething = true;
      this.applyEffect(caster, effect, targets);
    }
    if (didSomething) {
      const center = this.effectCenter(caster, forcedTarget);
      this.emit({
        t: 'skill',
        uid: caster.uid,
        skillId: skill.id,
        vfx: skill.vfx,
        x: center.x,
        y: center.y,
        radius: maxRadius(skill),
      });
    }
    return didSomething;
  }

  private effectCenter(caster: Unit, forcedTarget?: Unit): { x: number; y: number } {
    const t = forcedTarget ?? (caster.targetUid !== null ? this.unit(caster.targetUid) : undefined);
    if (t && t.alive) return { x: t.x, y: t.y };
    return { x: caster.x, y: caster.y };
  }

  private resolveTargets(caster: Unit, effect: Effect, forcedTarget?: Unit): Unit[] {
    if (
      effect.kind === 'cost_gain' ||
      effect.kind === 'cost_rate' ||
      effect.kind === 'trait' ||
      effect.kind === 'splash_on_hit' ||
      effect.kind === 'summon'
    ) {
      return [caster];
    }
    const target = 'target' in effect ? effect.target : 'self';
    const radius = 'radius' in effect ? effect.radius : 0;
    const enemyFaction = caster.faction === 'hero' ? 'enemy' : 'hero';

    switch (target) {
      case 'self':
        return [caster];
      case 'current_target': {
        const t = forcedTarget ?? (caster.targetUid !== null ? this.unit(caster.targetUid) : undefined);
        return t && t.alive ? [t] : [];
      }
      case 'blocked_enemies': {
        if (!isHero(caster)) return [];
        return caster.blocking
          .map((uid) => this.unit(uid))
          .filter((u): u is Unit => !!u && u.alive);
      }
      case 'enemies_in_radius': {
        const c = this.effectCenter(caster, forcedTarget);
        const r2 = radius * radius;
        return this.units.filter(
          (u) => u.alive && u.faction === enemyFaction && dist2(c.x, c.y, u.x, u.y) <= r2 && this.castVisible(caster, u),
        );
      }
      case 'enemies_in_range': {
        const r2 = effRange(caster) ** 2;
        return this.units.filter(
          (u) => u.alive && u.faction === enemyFaction && dist2(caster.x, caster.y, u.x, u.y) <= r2 && this.castVisible(caster, u),
        );
      }
      case 'allies_in_radius': {
        const r2 = radius * radius;
        return this.units.filter((u) => u.alive && u.faction === caster.faction && dist2(caster.x, caster.y, u.x, u.y) <= r2);
      }
      case 'lowest_hp_ally': {
        const r2 = effRange(caster) ** 2;
        let best: Unit | null = null;
        let bestRatio = 1;
        for (const u of this.units) {
          if (!u.alive || u.faction !== caster.faction) continue;
          if (dist2(caster.x, caster.y, u.x, u.y) > r2) continue;
          const ratio = u.hp / u.maxHp;
          if (ratio >= 1) continue;
          if (ratio < bestRatio) {
            bestRatio = ratio;
            best = u;
          }
        }
        return best ? [best] : [];
      }
    }
  }

  /** สกิลของฮีโร่มองไม่เห็นศัตรูล่องหนที่ยังไม่ถูกเปิด เช่นเดียวกับการโจมตีปกติ */
  private castVisible(caster: Unit, target: Unit): boolean {
    if (!isHero(caster) || !isEnemy(target)) return true;
    return this.isTargetable(caster, target);
  }

  private applyEffect(caster: Unit, effect: Effect, targets: Unit[]): void {
    switch (effect.kind) {
      case 'damage':
        for (const t of targets) {
          for (let h = 0; h < effect.hits; h++) {
            const out = computeDamage(
              caster,
              t,
              { ratio: effect.ratio, damageType: effect.damageType, element: effect.element },
              this.rng,
            );
            this.applyDamage(t, out.amount, caster, true);
            this.emit({
              t: 'hit',
              from: caster.uid,
              to: t.uid,
              amount: out.amount,
              crit: out.crit,
              kind: effect.damageType ?? caster.damageType,
              matchup: out.matchup,
            });
          }
        }
        break;
      case 'heal': {
        const amount = effAtk(caster) * effect.ratio;
        for (const t of targets) this.heal(t, amount, caster);
        break;
      }
      case 'status':
        for (const t of targets) {
          if (!this.rng.chance(effect.chance)) continue;
          this.addStatus(t, effect.status, effect.durationSec, this.statusValue(effect.status, effect.potency, caster, t), caster.uid);
        }
        break;
      case 'stat_mod':
        for (const t of targets) {
          if (effect.stat === 'hp') {
            const add = Math.round(t.maxHp * (effect.mult - 1) + effect.add);
            t.maxHp += add;
            t.hp += add;
          } else if (effect.stat === 'block') {
            if (isHero(t)) t.blockCount = Math.max(0, Math.round((t.blockCount + effect.add) * effect.mult));
          } else {
            t.mods.push({
              stat: effect.stat,
              mult: effect.mult,
              add: effect.add,
              remaining: effect.durationSec > 0 ? effect.durationSec : Infinity,
            });
          }
        }
        break;
      case 'cost_gain':
        this.cost = Math.min(MAX_COST, this.cost + effect.amount);
        break;
      case 'reveal':
        for (const u of this.units) {
          if (!u.alive || !isEnemy(u)) continue;
          if (dist2(caster.x, caster.y, u.x, u.y) <= effect.radius ** 2) {
            this.addStatus(u, 'revealed', 6, 0, caster.uid);
          }
        }
        break;
      case 'summon': {
        // MVP เรียกลูกสมุนออกมาบนเส้นทางเดียวกัน ถัดจากตัวเองไปข้างหลัง
        if (!isEnemy(caster)) break;
        for (let i = 0; i < effect.count; i++) {
          this.summonedTotal++;
          this.spawnEnemy(
            {
              timeSec: this.elapsedSec,
              enemyId: effect.enemy,
              path: caster.pathId,
              hpMult: 1,
              atkMult: 1,
              waveId: 'summon',
              waveLabel: '',
              order: -1,
            },
            caster.dist - effect.behind * (i + 1),
          );
        }
        break;
      }
      case 'cost_rate':
      case 'trait':
      case 'splash_on_hit':
        // จัดการตอน applyPassives แล้ว
        break;
    }
  }

  private statusValue(kind: StatusKind, potency: number, caster: Unit, target: Unit): number {
    switch (kind) {
      case 'shield':
        return target.maxHp * potency;
      case 'poison':
        return effAtk(caster) * potency;
      default:
        return potency;
    }
  }

  addStatus(target: Unit, kind: StatusKind, durationSec: number, value: number, sourceUid: number): void {
    const existing = target.statuses.find((s) => s.kind === kind && s.sourceUid === sourceUid);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, durationSec);
      existing.value = kind === 'shield' ? existing.value + value : Math.max(existing.value, value);
    } else {
      target.statuses.push({ kind, remaining: durationSec, value, sourceUid });
    }
    this.emit({ t: 'status', uid: target.uid, kind, durationSec });
  }

  /* ---------------------------------------------------------------- */
  /* จบด่าน                                                            */
  /* ---------------------------------------------------------------- */

  private cleanup(): void {
    if (this.units.some((u) => !u.alive)) {
      this.units = this.units.filter((u) => u.alive);
    }
  }

  private checkEnd(): void {
    if (this.baseHp <= 0) {
      this.baseHp = 0;
      this.status = 'lost';
      this.emit({ t: 'end', win: false });
      return;
    }
    if (this.spawnIndex >= this.spawnQueue.length && this.aliveEnemies.length === 0) {
      this.status = 'won';
      this.emit({ t: 'end', win: true });
      return;
    }
    if (this.tick >= this.maxTicks) {
      this.status = 'lost';
      this.emit({ t: 'end', win: false });
    }
  }

  private meets(cond: StarCondition): boolean {
    switch (cond.type) {
      case 'base_hp_pct':
        return (this.baseHp / this.baseHpMax) * 100 >= cond.value;
      case 'no_leak':
        return this.leaks === 0;
      case 'max_heroes':
        return this.heroesEverDeployed.size <= cond.value;
      case 'no_ultimate':
        return this.ultimatesUsed === 0;
      case 'clear_under_sec':
        return this.elapsedSec <= cond.value;
    }
  }

  stars(): number {
    if (this.status !== 'won') return 0;
    let s = 1;
    if (this.meets(this.stage.stars.two)) s = 2;
    if (s === 2 && this.meets(this.stage.stars.three)) s = 3;
    return s;
  }

  result(): BattleResult {
    const won = this.status === 'won';
    return {
      status: this.status,
      win: won,
      stars: this.stars(),
      ticks: this.tick,
      elapsedSec: Math.round(this.elapsedSec * 10) / 10,
      baseHp: this.baseHp,
      baseHpMax: this.baseHpMax,
      leaks: this.leaks,
      enemiesKilled: this.enemiesKilled,
      enemiesTotal: this.enemiesTotal,
      heroesUsed: this.heroesEverDeployed.size,
      ultimatesUsed: this.ultimatesUsed,
      goldEarned: this.goldEarned + (won ? this.stage.rewards.gold : 0),
      expEarned: this.expEarned + (won ? this.stage.rewards.exp : 0),
      heroes: [...this.heroReports.values()].map((r) => ({
        ...r,
        damageDealt: Math.round(r.damageDealt),
        damageTaken: Math.round(r.damageTaken),
        healed: Math.round(r.healed),
      })),
    };
  }
}

function maxRadius(skill: Skill): number {
  let r = 0;
  for (const e of skill.effects) if ('radius' in e && e.radius > r) r = e.radius;
  return r;
}

function buildSpawnQueue(stage: Stage): SpawnEntry[] {
  const out: SpawnEntry[] = [];
  let order = 0;
  for (const wave of stage.waves) {
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        out.push({
          timeSec: wave.startSec + g.delaySec + i * g.intervalSec,
          enemyId: g.enemy,
          path: g.path,
          hpMult: g.hpMult,
          atkMult: g.atkMult,
          waveId: wave.id,
          waveLabel: wave.label_th || wave.id,
          order: order++,
        });
      }
    }
  }
  // ตัดสินด้วยลำดับในไฟล์ ไม่ใช่ชื่อศัตรู — เปลี่ยนชื่อ/ธีมแล้วผลจำลองต้องไม่เปลี่ยน
  out.sort((a, b) => a.timeSec - b.timeSec || a.order - b.order);
  return out;
}
