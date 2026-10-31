// Safe-dock fitting overlay. The simulation is paused, so planning time is
// unlimited (SYSTEMS §5). Shows the 7×7 grid, legal origins, before/after stats
// and explains invalid placements in plain words. Nothing can be lost here.
import type { Cell, WeaponRow } from "../core/types";
import type { CombatWorld } from "../combat/world";
import { t } from "../core/i18n";
import { sfx } from "../audio/sfx";
import { button, el, type App } from "./app";

const SHORT: Record<string, string> = { W001: "1", W008: "8", W022: "22" };

function dps(mods: WeaponRow[]): number {
  return Math.round(mods.reduce((s, w) => s + w.trigger_rate * w.projectiles_per_trigger * w.damage, 0));
}

export class DockPanel {
  private root: HTMLElement;
  private preview: Cell | null = null;
  private decided = false;
  private scrapArmed = false;
  private msg = "";

  constructor(app: App, private w: CombatWorld, private onClose: () => void) {
    this.root = el("div", "dock");
    app.ui.append(this.root);
    const best = w.assembly.suggestOrigins(w.dockWeapon()!)[0];
    this.preview = best ?? null;
    this.render();
  }

  close(): void { this.root.remove(); }

  private render(): void {
    const w = this.w;
    const item = w.dockItem()!;
    const weapon = w.dockWeapon()!;
    const r = this.root;
    r.replaceChildren();
    r.append(el("h2", "", t("dock.title")), el("div", "dim", t("dock.subtitle")));
    const info = el("div", "card");
    const src = item.sourceEncounter === "player" ? t("dock.own_module") : t(`bosses.${item.sourceEncounter}.name`);
    info.append(el("p", "", `${t(`weapons.${weapon.id}.name`)} · ${src}`),
      el("div", "dim", t("dock.part_info", { mass: weapon.mass, cells: weapon.footprint.length, dmg: weapon.damage, rate: weapon.trigger_rate })));
    r.append(info);
    if (!this.decided) {
      r.append(el("div", "dim", t("dock.steps")));
      const auto = button(t("dock.auto_fit"), () => { this.preview = w.assembly.suggestOrigins(weapon)[0] ?? null; this.fit(); }, "btn primary");
      auto.disabled = !w.assembly.suggestOrigins(weapon).length;
      r.append(auto);
      r.append(el("div", "nose", t("dock.nose")));
      r.append(this.grid(weapon));
      r.append(el("div", "dim", t("dock.legend")));
      r.append(this.stats(weapon));
      const err = el("div", "err", this.msg);
      r.append(err);
      const fitBtn = button(t("dock.fit_here"), () => this.fit(), "btn small");
      fitBtn.disabled = !this.preview || !!w.assembly.canPlace(weapon, this.preview);
      r.append(fitBtn);
      const row = el("div", "row");
      const scrapBtn = button(this.scrapArmed ? t("dock.scrap_confirm_tap") : t("dock.scrap"), () => this.scrap(), "btn small");
      row.append(button(t("dock.stow", { n: w.hold.length, cap: w.holdCapacity }), () => this.stow(), "btn small", "ui_cargo"), scrapBtn);
      if (this.scrapArmed) r.append(el("div", "err", t("dock.scrap_confirm")));
      r.append(row);
    } else {
      r.append(el("p", "", this.msg), button(t("dock.launch"), () => this.launch(), "btn primary"));
    }
  }

  private grid(weapon: WeaponRow): HTMLElement {
    const w = this.w;
    const a = w.assembly;
    const grid = el("div", "grid");
    const mask = new Set(a.hull.socket_mask.map((c) => `${c[0]},${c[1]}`));
    const occ = new Map<string, string>();
    for (const m of a.modules) for (const c of m.cells) occ.set(`${c[0]},${c[1]}`, m.weapon.id);
    const valid = new Set(a.suggestOrigins(weapon).map((c) => `${c[0]},${c[1]}`));
    const preview = this.preview ? new Set(a.footprintAt(weapon, this.preview).map((c) => `${c[0]},${c[1]}`)) : new Set<string>();
    // Row 0 on screen is the nose (grid y = 6).
    for (let row = 0; row < 7; row++) for (let x = 0; x < 7; x++) {
      const y = 6 - row;
      const k = `${x},${y}`;
      const cell = el("div", "cell");
      if (mask.has(k)) cell.classList.add("mask");
      if (x === a.hull.reactor_cell[0] && y === a.hull.reactor_cell[1]) { cell.classList.add("reactor"); cell.textContent = "⚡"; }
      const mod = occ.get(k);
      if (mod) { cell.classList.add("mod", mod); cell.textContent = SHORT[mod] ?? mod; }
      if (valid.has(k)) cell.classList.add("valid");
      if (preview.has(k)) cell.classList.add("preview");
      cell.addEventListener("click", () => {
        const err = a.canPlace(weapon, [x, y]);
        this.preview = [x, y];
        this.msg = err ? t(err) : "";
        sfx.play("ui");
        this.render();
      });
      grid.append(cell);
    }
    return grid;
  }

  private stats(weapon: WeaponRow): HTMLElement {
    const w = this.w;
    const card = el("div", "statrow");
    const mods = w.assembly.modules.map((m) => m.weapon);
    const mass = w.assembly.fittedMass();
    const speed = (m: number) => Math.round(w.motion.baseSpeed * Math.max(0.55, Math.min(1, 1 - (0.25 * m) / w.motion.massCap)));
    const line = (label: string, a: string | number, b: string | number) => {
      const d = el("span");
      d.append(`${label} `, el("b", "", `${a}→${b}`));
      return d;
    };
    card.append(line(t("dock.stat_mass"), `${mass}/${w.assembly.hull.mass_cap}`, `${mass + weapon.mass}/${w.assembly.hull.mass_cap}`),
      line(t("dock.stat_speed"), speed(mass), speed(mass + weapon.mass)),
      line(t("dock.stat_dps"), dps(mods), dps([...mods, weapon])));
    return card;
  }

  private fit(): void {
    if (!this.preview) return;
    const err = this.w.dockFit(this.preview);
    if (err) { this.msg = t(err); this.render(); return; }
    sfx.play("secured");
    this.decided = true;
    this.msg = this.w.dockItem()?.sourceEncounter !== "player" ? t("dock.fitted_detail") : t("dock.fitted");
    this.render();
  }

  private stow(): void {
    const err = this.w.dockStow();
    if (err) { this.msg = t(err); this.render(); return; }
    this.decided = true;
    this.msg = t("dock.stowed");
    this.render();
  }

  // Two taps instead of confirm(): browser dialogs are unavailable in some hosts.
  private scrap(): void {
    if (!this.scrapArmed) { this.scrapArmed = true; this.render(); return; }
    this.w.dockScrap();
    this.decided = true;
    this.msg = t("dock.scrapped");
    this.render();
  }

  private launch(): void {
    if (!this.w.endDock()) return;
    this.close();
    this.onClose();
  }
}
