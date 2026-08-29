import {
  ARMORED_PHYSICAL_MULT,
  elementMatchup,
  elementMultiplier,
  GLANCING_CHANCE,
  GLANCING_MULT,
  MAGIC_RESIST_TRAIT_MULT,
  MIN_DAMAGE_RATIO,
  type DamageType,
  type Element,
} from '@runegate/data';
import type { Rng } from './rng.js';
import { effAtk, effCritDmg, effCritRate, effDef, effMres } from './stats.js';
import { isEnemy, isHero, type Unit } from './types.js';

export interface DamageOutput {
  amount: number;
  crit: boolean;
  matchup: 'advantage' | 'disadvantage' | 'neutral';
}

export interface DamageOptions {
  ratio: number;
  damageType?: DamageType | undefined;
  element?: Element | undefined;
  canCrit?: boolean;
  /** ตัวคูณเพิ่มเติมจากการ์ด/รูน (Phase 6 เสียบเข้าตรงนี้) */
  extraMult?: number;
}

/**
 * สูตรดาเมจกลางของเกม (§5.3)
 *   physical: (ATK*ratio*crit) − DEF   แต่ไม่ต่ำกว่า 5% ของดาเมจดิบ
 *   magic:    (ATK*ratio*crit) × (1−MRES)
 *   true:     ทะลุทุกอย่าง
 * แล้วคูณ ธาตุ → trait ของศัตรู → โบนัสพิเศษ
 */
export function computeDamage(attacker: Unit, defender: Unit, opts: DamageOptions, rng: Rng): DamageOutput {
  const canCrit = opts.canCrit ?? true;
  const crit = canCrit && rng.chance(effCritRate(attacker));
  const raw = effAtk(attacker) * opts.ratio * (crit ? effCritDmg(attacker) : 1);
  const type: DamageType = opts.damageType ?? attacker.damageType;

  let dmg: number;
  if (type === 'true') {
    dmg = raw;
  } else if (type === 'magic') {
    dmg = Math.max(raw * (1 - effMres(defender)), raw * MIN_DAMAGE_RATIO);
  } else {
    dmg = Math.max(raw - effDef(defender), raw * MIN_DAMAGE_RATIO);
  }

  const atkElement: Element = opts.element ?? attacker.element;
  const matchup = elementMatchup(atkElement, defender.element);
  dmg *= elementMultiplier(atkElement, defender.element);
  if (matchup === 'disadvantage' && rng.chance(GLANCING_CHANCE)) dmg *= GLANCING_MULT;

  if (isEnemy(defender) && type !== 'true') {
    if (type === 'physical' && defender.traits.includes('armored')) dmg *= ARMORED_PHYSICAL_MULT;
    if (type === 'magic' && defender.traits.includes('magic_resist')) dmg *= MAGIC_RESIST_TRAIT_MULT;
  }

  if (isHero(attacker) && isEnemy(defender)) {
    if (defender.traits.includes('flying')) dmg *= 1 + attacker.antiAir;
    dmg *= 1 + (attacker.raceBonus[defender.race] ?? 0);
    dmg *= 1 + (attacker.elementBonus[atkElement] ?? 0);
  }

  dmg *= opts.extraMult ?? 1;

  return { amount: Math.max(1, Math.round(dmg)), crit, matchup };
}
