import { z } from 'zod';

import heroesJson from '../content/heroes.json';
import enemiesJson from '../content/enemies.json';
import skillsJson from '../content/skills.json';
import cardsJson from '../content/cards.json';
import runesJson from '../content/runes.json';
import economyJson from '../content/economy.json';
import dropsJson from '../content/drops.json';
import stage101 from '../content/stages/ch1_01.json';
import stage102 from '../content/stages/ch1_02.json';
import stage103 from '../content/stages/ch1_03.json';

import { Hero, heroStatsAtLevel, MAX_LEVEL_BY_STAR } from './schema/hero.js';
import { Enemy } from './schema/enemy.js';
import { Skill } from './schema/skill.js';
import { Card } from './schema/card.js';
import { RuneConfig } from './schema/rune.js';
import { EconomyConfig } from './schema/economy.js';
import { DropTable } from './schema/drop.js';
import { Stage } from './schema/stage.js';

export * from './schema/common.js';
export * from './schema/skill.js';
export * from './schema/hero.js';
export * from './schema/enemy.js';
export * from './schema/stage.js';
export * from './schema/rune.js';
export * from './schema/card.js';
export * from './schema/economy.js';
export * from './schema/drop.js';
export * from './balance.js';
export { validateContent, tilesAlongPath, tileAt } from './validate.js';
export type { ContentIssue } from './validate.js';
export { heroStatsAtLevel, MAX_LEVEL_BY_STAR };

function parseAll<S extends z.ZodTypeAny>(schema: S, rows: unknown[], label: string): z.infer<S>[] {
  return rows.map((row, i) => {
    const res = schema.safeParse(row);
    if (!res.success) {
      const id = (row as { id?: string })?.id ?? `#${i}`;
      throw new Error(`[data] ${label} "${id}" ไม่ผ่าน schema:\n${formatIssues(res.error)}`);
    }
    return res.data;
  });
}

function parseOne<S extends z.ZodTypeAny>(schema: S, row: unknown, label: string): z.infer<S> {
  const res = schema.safeParse(row);
  if (!res.success) throw new Error(`[data] ${label} ไม่ผ่าน schema:\n${formatIssues(res.error)}`);
  return res.data;
}

function formatIssues(err: z.ZodError): string {
  return err.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

export const heroes: Hero[] = parseAll(Hero, heroesJson as unknown[], 'hero');
export const enemies: Enemy[] = parseAll(Enemy, enemiesJson as unknown[], 'enemy');
export const skills: Skill[] = parseAll(Skill, skillsJson as unknown[], 'skill');
export const cards: Card[] = parseAll(Card, cardsJson as unknown[], 'card');
export const dropTables: DropTable[] = parseAll(DropTable, dropsJson as unknown[], 'dropTable');
export const stages: Stage[] = parseAll(Stage, [stage101, stage102, stage103] as unknown[], 'stage');
export const runeConfig: RuneConfig = parseOne(RuneConfig, runesJson, 'runeConfig');
export const economy: EconomyConfig = parseOne(EconomyConfig, economyJson, 'economy');

function index<T extends { id: string }>(rows: T[]): ReadonlyMap<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) {
    if (m.has(r.id)) throw new Error(`[data] id ซ้ำ: ${r.id}`);
    m.set(r.id, r);
  }
  return m;
}

export const heroById = index(heroes);
export const enemyById = index(enemies);
export const skillById = index(skills);
export const cardById = index(cards);
export const stageById = index(stages);
export const dropTableById = index(dropTables);

export function getHero(id: string): Hero {
  const h = heroById.get(id);
  if (!h) throw new Error(`[data] ไม่พบฮีโร่ id "${id}"`);
  return h;
}
export function getEnemy(id: string): Enemy {
  const e = enemyById.get(id);
  if (!e) throw new Error(`[data] ไม่พบศัตรู id "${id}"`);
  return e;
}
export function getSkill(id: string): Skill {
  const s = skillById.get(id);
  if (!s) throw new Error(`[data] ไม่พบสกิล id "${id}"`);
  return s;
}
export function getStage(id: string): Stage {
  const s = stageById.get(id);
  if (!s) throw new Error(`[data] ไม่พบด่าน id "${id}"`);
  return s;
}
