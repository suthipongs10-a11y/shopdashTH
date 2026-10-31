import { loadCatalog } from "../src/core/catalog";
import { CombatWorld, type WorldOptions } from "../src/combat/world";

export const catalog = loadCatalog();
export const world = (opts: WorldOptions = {}) => new CombatWorld(catalog, opts);

// Advance a world until the boss exists and has finished entering.
export function toBossFight(w: CombatWorld, maxTicks = 60 * 20): void {
  for (let i = 0; i < maxTicks && (!w.boss || w.boss.entering); i++) w.step({ move: { x: 0, y: 0 }, fire: false });
  if (!w.boss || w.boss.entering) throw new Error("boss did not arrive");
}
