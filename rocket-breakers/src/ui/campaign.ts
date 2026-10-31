// Campaign screens (M2): sector map with sequential unlocks, mission briefing with
// the three star objectives, and the star row used on the results screen.
import type { MissionRow } from "../core/types";
import { totalStars } from "../save/profile";
import { missionPlayable, missionWaves } from "../campaign/missionDirector";
import { cleared, missionUnlocked } from "../campaign/progress";
import { SUPPORTED_OBJECTIVES } from "../campaign/stars";
import { baselineRewards } from "../campaign/settlement";
import { i18n, t } from "../core/i18n";
import type { Catalog } from "../core/catalog";
export { researchPool } from "../campaign/progress";
import { button, el, icon, type App } from "./app";

export const SECTOR = "P01";

export function sectorMissions(c: Catalog, sector = SECTOR): MissionRow[] {
  return c.raw.missions.filter((m) => m.sector_id === sector);
}

export function objectiveText(o: MissionRow["star_objectives"][number]): string {
  const key = `obj.${o.key}`;
  if (i18n.has(key)) return t(key, { n: o.threshold, target: o.target_id ? t(`weapons.${o.target_id}.name`) : "" });
  return o.description_th;
}

// Star icon (BATCH_006); CSS star shape as a fallback.
function star(on: boolean): HTMLElement {
  return icon(on ? "ui_star_full" : "ui_star_empty", on ? "star on" : "star") ?? el("i", on ? "on" : "");
}

function starPips(stars: readonly boolean[] | undefined, cls = "pips"): HTMLElement {
  const d = el("span", cls);
  for (let i = 0; i < 3; i++) d.append(star(!!stars?.[i]));
  return d;
}

export function showSectorMap(app: App): void {
  const c = app.catalog, p = app.profile;
  app.show({ draw: (g) => mapBackground(g) });
  const s = el("div", "screen map");
  const h = el("h2", "maptitle", t(`sectors.${SECTOR}.name`));
  const g = icon("ui_galaxy");
  if (g) h.prepend(g);
  s.append(h, el("div", "dim", t("map.subtitle", { stars: totalStars(p) })));
  const list = el("div", "nodes");
  sectorMissions(c).forEach((m, i) => {
    const unlocked = missionUnlocked(c, p, m);
    const playable = missionPlayable(m);
    const node = el("button", "node");
    node.dataset.mission = m.id;
    if (!unlocked) node.classList.add("locked");
    if (!playable) node.classList.add("soon");
    if (cleared(p, m.id)) node.classList.add("cleared");
    if (m.encounter_id) node.classList.add("boss");
    const num = el("span", "num", String(i + 1));
    const body = el("span", "body");
    body.append(el("b", "", t(`missions.${m.id}.name`)), el("small", "", !unlocked ? t("map.locked") : !playable ? t("map.soon") : t(`role.${m.role}`)));
    node.append(num, body, starPips(p.mission_records[m.id]?.stars));
    node.disabled = !unlocked || !playable;
    node.addEventListener("click", () => showBriefing(app, m.id));
    list.append(node);
  });
  s.append(list, button(t("common.back"), () => app.showTitle(), "btn"));
  app.ui.append(s);
}

export function showBriefing(app: App, missionId: string): void {
  const m = app.catalog.mission(missionId);
  const rec = app.profile.mission_records[m.id];
  app.show({ draw: (g) => mapBackground(g) });
  const s = el("div", "screen");
  s.append(el("h2", "", t(`missions.${m.id}.name`)), el("div", "dim", `${m.id} · ${t(`role.${m.role}`)}`));
  const card = el("div", "card");
  card.append(el("div", "dim", t("brief.stars")));
  const ol = el("ol", "objectives");
  m.star_objectives.forEach((o, i) => {
    const li = el("li", rec?.stars[i] ? "got" : "");
    li.append(el("span", "", objectiveText(o)));
    if (!SUPPORTED_OBJECTIVES.has(o.key)) li.append(el("small", "dim", ` ${t("brief.not_yet")}`));
    ol.append(li);
  });
  card.append(ol);
  const foes = [...new Set(missionWaves(m).map((w) => w.encounter_id ? t(`bosses.${w.encounter_id}.name`) : t(`enemies.${w.enemy_id}.name`)))];
  card.append(el("div", "dim", t("brief.enemies")), el("p", "", foes.join(" · ")));
  const r = baselineRewards(+m.id.slice(1, 3), +m.id.slice(4));
  card.append(el("div", "dim", t("brief.rewards", { credits: rec?.stars[0] ? Math.floor(r.credits * 0.6) : r.credits * 2, scrap: r.scrap })));
  if (m.waves.some((w) => (w as { enemy_id?: string }).enemy_id === "E04")) card.append(el("div", "tag", t("brief.hauler_tip")));
  if (m.waves.some((w) => (w as { enemy_id?: string }).enemy_id === "E21")) card.append(el("div", "tag", t("brief.snatcher_tip")));
  s.append(card);
  s.append(button(t("brief.launch"), () => app.startMission(m.id), "btn primary", "ui_play"));
  s.append(button(t("common.back"), () => showSectorMap(app), "btn"));
  app.ui.append(s);
}

// Results star row: newly earned, previously earned and missed shown separately.
export function resultStars(m: MissionRow, before: readonly boolean[] | undefined, earned: readonly boolean[] | null): HTMLElement {
  const box = el("div", "result-stars");
  m.star_objectives.forEach((o, i) => {
    const got = !!earned?.[i], had = !!before?.[i];
    const row = el("div", `rstar ${got && !had ? "new" : had ? "had" : got ? "had" : "miss"}`);
    row.append(star(got || had), el("span", "", objectiveText(o)),
      el("small", "", got && !had ? t("results.star_new") : had ? t("results.star_had") : t("results.star_missed")));
    box.append(row);
  });
  return box;
}

let mapT = 0;
function mapBackground(g: CanvasRenderingContext2D): void {
  mapT += 1 / 60;
  g.fillStyle = "#08121f"; g.fillRect(0, 0, 720, 1280);
  for (let i = 0; i < 70; i++) {
    const x = (i * 131) % 720, y = (i * 211 + mapT * (10 + (i % 3) * 12)) % 1280;
    g.fillStyle = `rgba(57,225,255,${0.1 + (i % 3) * 0.12})`; g.fillRect(x, y, 2, 2);
  }
}
