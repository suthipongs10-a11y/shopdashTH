// Fitted ship layout on the 7×7 attachment grid (AGENTS §7). Origin (3,3) is the
// reactor; grid y grows toward the nose (negative screen y). Placement must stay
// on the hull mask, not overlap, respect mass cap and connect to the reactor bus.
import type { Cell, HullRow, WeaponRow } from "../core/types";
import type { Vec } from "../core/geometry";
import type { Catalog } from "../core/catalog";
import { MAX_HALF_WIDTH } from "./motion";

export const TILE = 22;
export const HULL_VISUAL_HALF_WIDTH = 29;
// Player module integrity is not in the catalog; see docs/DECISIONS.md.
export const MODULE_INTEGRITY = 40;

export type FitError = "fit.error.off_mask" | "fit.error.overlap" | "fit.error.reactor" | "fit.error.over_mass" | "fit.error.floating";

export interface FittedModule {
  instanceId: string;
  weapon: WeaponRow;
  origin: Cell;
  cells: Cell[];
  integrity: number;
  integrityMax: number;
  disabled: boolean;
  salvageId: string | null; // provenance when the module came from salvage
}

const key = (c: Cell) => `${c[0]},${c[1]}`;

export function cellToLocal(c: Cell): Vec {
  return { x: (c[0] - 3) * TILE, y: -(c[1] - 3) * TILE };
}

export class Assembly {
  readonly modules: FittedModule[] = [];
  private mask: Set<string>;
  private nextId = 1;

  constructor(readonly hull: HullRow) {
    this.mask = new Set(hull.socket_mask.map(key));
  }

  static fromStarter(hull: HullRow, catalog: Catalog): Assembly {
    const a = new Assembly(hull);
    // Authored layouts are validated as a whole: connectivity can depend on placement order.
    for (const e of hull.starter_loadout ?? []) {
      const err = a.place(catalog.weapon(e.weapon_id), e.grid_origin, null, false);
      if (err) throw new Error(`starter loadout ${hull.id}: ${err}`);
    }
    if (!a.allConnected(a.occupied())) throw new Error(`starter loadout ${hull.id}: fit.error.floating`);
    return a;
  }

  fittedMass(): number {
    return this.modules.reduce((m, x) => m + x.weapon.mass, 0);
  }

  occupied(exceptId?: string): Map<string, string> {
    const occ = new Map<string, string>();
    for (const m of this.modules) if (m.instanceId !== exceptId) for (const c of m.cells) occ.set(key(c), m.instanceId);
    return occ;
  }

  footprintAt(w: WeaponRow, origin: Cell): Cell[] {
    return w.footprint.map(([x, y]) => [origin[0] + x, origin[1] + y] as Cell);
  }

  // Returns null when legal, otherwise a localisation key explaining why.
  canPlace(w: WeaponRow, origin: Cell, replacingId?: string, checkConnect = true): FitError | null {
    const cells = this.footprintAt(w, origin);
    const occ = this.occupied(replacingId);
    for (const c of cells) {
      if (!this.mask.has(key(c))) return "fit.error.off_mask";
      if (key(c) === key(this.hull.reactor_cell)) return "fit.error.reactor";
      if (occ.has(key(c))) return "fit.error.overlap";
    }
    const replaced = this.modules.find((m) => m.instanceId === replacingId);
    if (this.fittedMass() - (replaced?.weapon.mass ?? 0) + w.mass > this.hull.mass_cap) return "fit.error.over_mass";
    for (const c of cells) occ.set(key(c), "candidate");
    if (checkConnect && !this.allConnected(occ)) return "fit.error.floating";
    return null;
  }

  place(w: WeaponRow, origin: Cell, salvageId: string | null = null, checkConnect = true): FitError | null {
    const err = this.canPlace(w, origin, undefined, checkConnect);
    if (err) return err;
    this.modules.push({
      instanceId: `m${this.nextId++}`, weapon: w, origin, cells: this.footprintAt(w, origin),
      integrity: MODULE_INTEGRITY, integrityMax: MODULE_INTEGRITY, disabled: false, salvageId,
    });
    return null;
  }

  // Removing a support never deletes inventory: the caller receives the module back.
  remove(instanceId: string): FittedModule | null {
    const i = this.modules.findIndex((m) => m.instanceId === instanceId);
    return i < 0 ? null : this.modules.splice(i, 1)[0];
  }

  // Legal origins for a module, most forward and central first.
  suggestOrigins(w: WeaponRow): Cell[] {
    const out: Cell[] = [];
    for (let y = 6; y >= 0; y--) for (let x = 0; x < 7; x++) if (!this.canPlace(w, [x, y])) out.push([x, y]);
    return out.sort((a, b) => b[1] - a[1] || Math.abs(a[0] - 3) - Math.abs(b[0] - 3));
  }

  halfWidth(): number {
    let hw = HULL_VISUAL_HALF_WIDTH;
    for (const m of this.modules) for (const c of m.cells) hw = Math.max(hw, Math.abs(cellToLocal(c).x) + TILE / 2);
    return Math.min(hw, MAX_HALF_WIDTH);
  }

  // Muzzle on the nose-side edge of the module's frontmost cell.
  muzzleLocal(m: FittedModule): Vec {
    const front = m.cells.reduce((best, c) => (c[1] > best[1] ? c : best), m.cells[0]);
    const p = cellToLocal(front);
    return { x: p.x, y: p.y - TILE / 2 };
  }

  // Every module cell must reach the reactor through orthogonally adjacent module cells.
  allConnected(occ: Map<string, string>): boolean {
    const start = this.hull.reactor_cell;
    const seen = new Set<string>([key(start)]);
    const queue: Cell[] = [start];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const n of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
        const k = key(n);
        if (!seen.has(k) && occ.has(k)) { seen.add(k); queue.push(n); }
      }
    }
    for (const k of occ.keys()) if (!seen.has(k)) return false;
    return true;
  }
}
