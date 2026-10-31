// Combat HUD drawn on the canvas. Thumb buttons are hit-tested by the input layer
// so a button touch never moves the ship and a second finger can act while the
// first keeps flying. At least 65% of the screen height stays free for action.
import type { CombatWorld } from "../combat/world";
import { DASH_COOLDOWN_SEC } from "../ships/motion";
import { HEAT_MAX } from "../combat/weapons";
import { t } from "../core/i18n";
import { C } from "./renderer";
import type { Vec } from "../core/geometry";
import { pickupDef } from "../combat/powerups";

export type HudAction = "dash" | "overdrive" | "ability" | "tractor" | "pause";
export interface HudButton { action: HudAction; c: Vec; r: number }
export interface Insets { top: number; bottom: number }

export const TOP_H = 118;

export function layoutButtons(insets: Insets, handed: "right" | "left"): HudButton[] {
  const by = 1280 - insets.bottom - 100;
  const x = (v: number) => (handed === "left" ? 720 - v : v);
  return [
    { action: "dash", c: { x: x(614), y: by }, r: 80 },
    { action: "overdrive", c: { x: x(456), y: by + 30 }, r: 58 },
    { action: "tractor", c: { x: x(614), y: by - 168 }, r: 62 },
    { action: "ability", c: { x: x(106), y: by + 30 }, r: 56 },
    { action: "pause", c: { x: x(670), y: insets.top + TOP_H + 42 }, r: 34 },
  ];
}

export function hitTest(buttons: HudButton[], p: Vec, w: CombatWorld): HudAction | null {
  for (const b of buttons) {
    if (b.action === "tractor" && !tractorVisible(w)) continue;
    if (Math.hypot(p.x - b.c.x, p.y - b.c.y) <= b.r + 12) return b.action;
  }
  return null;
}

export const tractorVisible = (w: CombatWorld): boolean => !!w.tractorCandidate() || !!w.tow;

export function drawHud(g: CanvasRenderingContext2D, w: CombatWorld, buttons: HudButton[], insets: Insets, pressed: Set<HudAction>, time: number): void {
  const top = insets.top;
  g.fillStyle = "rgba(4,10,20,0.78)"; g.fillRect(0, 0, 720, top + TOP_H);
  g.fillStyle = "#2b6f86"; g.fillRect(0, top + TOP_H, 720, 2);
  bar(g, 20, top + 12, 320, t("hud.hp"), w.hp / w.hpMax, C.hp);
  bar(g, 20, top + 48, 320, t("hud.shield"), w.shield / w.shieldMax, C.shield);
  bar(g, 370, top + 12, 330, t("hud.energy"), w.weapons.energy / w.weapons.energyCapacity, C.cyan);
  bar(g, 370, top + 48, 330, w.overdriveLeft > 0 ? t("hud.overdrive_on") : t("hud.overdrive"), w.overdriveLeft > 0 ? w.overdriveLeft / 5 : w.overdriveCharge / 100, w.overdriveLeft > 0 ? C.gold : C.orange);
  // per-module heat
  const mounts = w.weapons.mounts;
  const colW = 680 / Math.max(1, mounts.length);
  mounts.forEach((m, i) => {
    const name = t(`weapons.${m.module.weapon.id}.name`);
    const label = m.locked ? `${name} · ${t("hud.overheated")}` : m.blocked ? `${name} · ${t("hud.blocked")}` : name;
    bar(g, 20 + i * colW, top + 84, colW - 16, label, m.heat / HEAT_MAX, m.locked ? C.red : C.heat, 8);
  });
  // boss
  const b = w.boss;
  if (b && b.e.alive && !b.entering) {
    const y = top + TOP_H + 14;
    g.fillStyle = C.text; g.font = "700 20px RB Thai, sans-serif"; g.textAlign = "left";
    g.fillText(`${t("bosses.B02.name")} · ${t("hud.phase", { n: b.phase })}`, 20, y + 16);
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(20, y + 24, 600, 12);
    g.fillStyle = C.red; g.fillRect(20, y + 24, 600 * Math.max(0, b.hpFrac), 12);
    g.fillStyle = "#fff";
    for (const f of [0.6, 0.25]) g.fillRect(20 + 600 * f - 1, y + 20, 2, 20);
  } else {
    g.fillStyle = C.dim; g.font = "20px RB Thai, sans-serif"; g.textAlign = "left";
    g.fillText(`${t("hud.score")} ${w.score}`, 20, top + TOP_H + 30);
  }
  drawBuffs(g, w, 1280 - insets.bottom - 236); // bottom-left, above the thumb buttons and below the flight area
  g.fillStyle = "rgba(255,215,106,0.85)"; g.font = "16px RB Thai, sans-serif"; g.textAlign = "right";
  g.fillText(t("hud.placeholder"), 620, top + TOP_H + 30);
  for (const btn of buttons) drawButton(g, btn, w, pressed.has(btn.action), time);
}

// Active timed buffs stay visible (compact chips with remaining seconds).
function drawBuffs(g: CanvasRenderingContext2D, w: CombatWorld, y: number): void {
  let x = 20;
  const chips: [string, number, number][] = [];
  for (const [id, left] of w.buffs.remaining) chips.push([t(`powerups.${id}.name`), left, pickupDef(id).duration_sec]);
  if (w.overshield > 0) chips.push([`+${Math.ceil(w.overshield)} ${t("hud.overshield")}`, w.overshieldLeft, 10]);
  for (const [label, left, max] of chips) {
    g.font = "700 16px RB Thai, sans-serif";
    const tw = Math.min(170, g.measureText(label).width) + 56;
    g.fillStyle = "rgba(4,10,20,0.75)"; g.fillRect(x, y, tw, 30);
    g.fillStyle = "rgba(255,215,106,0.35)"; g.fillRect(x, y + 26, tw * (left / max), 4);
    g.fillStyle = C.text; g.textAlign = "left"; g.fillText(label, x + 8, y + 21, 170);
    g.fillStyle = C.gold; g.textAlign = "right"; g.fillText(`${Math.ceil(left)}s`, x + tw - 6, y + 21);
    x += tw + 8;
    if (x > 420) break; // stay clear of the tractor button
  }
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, frac: number, color: string, h = 12): void {
  g.fillStyle = C.dim; g.font = "17px RB Thai, sans-serif"; g.textAlign = "left";
  g.fillText(label, x, y + 12);
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x, y + 17, width, h);
  g.fillStyle = color; g.fillRect(x, y + 17, width * Math.max(0, Math.min(1, frac)), h);
}

function drawButton(g: CanvasRenderingContext2D, b: HudButton, w: CombatWorld, pressed: boolean, time: number): void {
  let ready = true;
  let fill = 1;
  let label = "";
  switch (b.action) {
    case "dash": fill = 1 - w.motion.dashCooldown / DASH_COOLDOWN_SEC; ready = w.motion.dashCooldown <= 0; label = t("hud.dash"); break;
    case "overdrive": fill = w.overdriveCharge / 100; ready = w.overdriveCharge >= 100 && w.overdriveLeft <= 0; label = t("hud.overdrive_btn"); break;
    case "ability": ready = false; fill = 0; label = t("hud.no_ability"); break;
    case "tractor": {
      if (!tractorVisible(w)) return;
      const towing = !!w.tow?.towing;
      label = towing ? (w.tow!.releaseArmed > 0 ? t("hud.release_confirm") : t("hud.release")) : t("hud.tractor");
      fill = towing ? 1 : (w.tow?.progress ?? 0) / 0.6;
      break;
    }
    case "pause": label = "II"; break;
  }
  const { x, y } = b.c;
  const glow = b.action === "tractor" && !w.tow?.towing ? 0.5 + 0.5 * Math.sin(time * 8) : 0;
  g.fillStyle = pressed ? "rgba(57,225,255,0.3)" : "rgba(4,10,20,0.72)";
  g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.fill();
  if (b.action !== "pause" && fill < 1) {
    g.strokeStyle = C.orange; g.lineWidth = 6;
    g.beginPath(); g.arc(x, y, b.r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, fill)); g.stroke();
  }
  g.strokeStyle = b.action === "tractor" ? `rgba(57,225,255,${0.6 + glow * 0.4})` : ready ? C.cyan : "#2b6f86";
  g.lineWidth = b.action === "tractor" ? 4 + glow * 3 : 3;
  g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = ready || b.action === "pause" || b.action === "tractor" ? C.text : C.dim;
  g.font = `700 ${b.r > 60 ? 26 : b.r > 40 ? 20 : 22}px RB Thai, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(label, x, y, b.r * 1.8);
  g.textBaseline = "alphabetic";
}
