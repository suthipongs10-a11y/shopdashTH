// App shell: boot services, scale the 720×1280 logical stage, run the frame loop
// and switch between screens. Menus are DOM (good Thai text layout); combat is canvas.
import { loadCatalog, type Catalog } from "../core/catalog";
import { DT, FrameDriver } from "../core/frameDriver";
import { TOUCH_SPEED_MULT } from "../ships/motion";
import { I18n, i18n, setI18n, t } from "../core/i18n";
import { limitLength, type Vec } from "../core/geometry";
import { CombatWorld, type GameEvent } from "../combat/world";
import { computeSettlement, recoverPending, settle, type Settlement } from "../campaign/settlement";
import { LoadStatus, MemoryStore, SaveRepository, type KeyValueStore } from "../save/saveRepository";
import { totalStars, type Profile } from "../save/profile";
import { sfx } from "../audio/sfx";
import { Renderer } from "./renderer";
import { drawHud, hitTest, layoutButtons, type HudAction, type HudButton, type Insets } from "./hud";
import { DockPanel } from "./dock";
import { preloadSprites, spriteUrl } from "./sprites";
import { researchPool, resultStars, showSectorMap } from "./campaign";

interface Screen { update?(dt: number): void; draw?(g: CanvasRenderingContext2D): void; dispose?(): void; onHidden?(): void }

function safeStorage(): { store: KeyValueStore; persistent: boolean } {
  try {
    const k = "rb.__probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return { store: localStorage, persistent: true };
  } catch {
    return { store: new MemoryStore(), persistent: false };
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function button(label: string, onClick: () => void, cls = "btn", icon?: string): HTMLButtonElement {
  const b = el("button", cls, label);
  const url = icon ? spriteUrl(icon) : null;
  if (url) {
    const img = el("img", "ico");
    img.src = url;
    img.alt = "";
    b.prepend(img);
  }
  b.addEventListener("click", () => { sfx.play("ui"); onClick(); });
  return b;
}

export class App {
  screen: Screen | null = null;
  scale = 1;
  insets: Insets = { top: 0, bottom: 0 };
  private last = 0;
  readonly g: CanvasRenderingContext2D;
  loadNote = "";

  constructor(readonly stage: HTMLElement, readonly canvas: HTMLCanvasElement, readonly ui: HTMLElement,
    readonly catalog: Catalog, readonly repo: SaveRepository, public profile: Profile, readonly persistent: boolean) {
    this.g = canvas.getContext("2d", { alpha: false })!;
    addEventListener("resize", () => this.fit());
    visualViewport?.addEventListener("resize", () => this.fit());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { this.screen?.onHidden?.(); sfx.suspend(); } else sfx.unlock();
    });
    addEventListener("pointerdown", () => sfx.unlock(), { capture: true });
    addEventListener("keydown", () => sfx.unlock(), { capture: true });
    this.fit();
    requestAnimationFrame((ts) => this.frame(ts));
  }

  fit(): void {
    const vw = visualViewport?.width ?? innerWidth;
    const vh = visualViewport?.height ?? innerHeight;
    const s = Math.min(vw / 720, vh / 1280);
    this.scale = s;
    this.stage.style.transform = `translate(${-360 * s}px, ${-640 * s}px) scale(${s})`;
    const k = Math.min(2.5, s * (devicePixelRatio || 1));
    this.canvas.width = Math.round(720 * k);
    this.canvas.height = Math.round(1280 * k);
    this.g.setTransform(this.canvas.width / 720, 0, 0, this.canvas.height / 1280, 0, 0);
    // Device safe-area insets → logical px, minus the letterbox band they may fall into.
    const probe = el("div");
    probe.style.cssText = "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const band = (vh - 1280 * s) / 2;
    this.insets = {
      top: Math.max(0, (parseFloat(cs.paddingTop) - band) / s),
      bottom: Math.max(0, (parseFloat(cs.paddingBottom) - band) / s),
    };
    probe.remove();
  }

  toLogical(clientX: number, clientY: number): Vec {
    const r = this.stage.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * 720, y: ((clientY - r.top) / r.height) * 1280 };
  }

  private frame(ts: number): void {
    const dt = this.last ? Math.min(0.25, (ts - this.last) / 1000) : 1 / 60;
    this.last = ts;
    this.screen?.update?.(dt);
    if (this.screen?.draw) this.screen.draw(this.g);
    requestAnimationFrame((n) => this.frame(n));
  }

  // Clears the previous screen first, then builds the next one (it may add DOM).
  show(next: Screen | (() => Screen)): void {
    this.screen?.dispose?.();
    this.ui.replaceChildren();
    this.screen = typeof next === "function" ? next() : next;
  }

  save(): boolean {
    const ok = this.repo.save(this.profile);
    if (!ok) console.warn("save failed:", this.repo.lastError);
    return ok;
  }

  setLocale(loc: "th" | "en"): void {
    this.profile.settings.language = loc;
    i18n.locale = loc;
    document.documentElement.lang = loc;
    this.save();
  }

  // ------------------------------------------------------------- menus
  showTitle(): void {
    this.show({ draw: (g) => idleBackground(g) });
    const s = el("div", "screen");
    const logo = el("div", "logo", "ROCKET BREAKERS");
    logo.appendChild(el("small", "", t("title.tagline")));
    s.append(logo);
    const frag = this.profile.blueprint_fragments.W022 ?? 0;
    const card = el("div", "card");
    const fr = el("div", "frag");
    const bp = icon("ui_blueprint");
    if (bp) fr.append(bp);
    fr.append(el("span", "", `${t("weapons.W022.name")} `));
    for (let i = 0; i < 3; i++) fr.append(el("i", i < frag ? "on" : ""));
    fr.append(el("span", "dim", ` ${Math.min(frag, 3)}/3`));
    card.append(el("div", "dim", t("title.blueprint")), fr);
    card.append(statRow(t("title.credits"), this.profile.credits, "ui_credits"), statRow(t("title.scrap"), this.profile.scrap, "ui_scrap"),
      statRow(t("title.stars"), `${totalStars(this.profile)} / ${this.catalog.campaignStarSlots()}`, "ui_star_full"));
    s.append(card);
    s.append(button(t("title.campaign"), () => showSectorMap(this), "btn primary", "ui_galaxy"));
    const row = el("div", "row");
    row.append(button(t("title.howto"), () => this.showHowTo(), "btn small"), button(t("title.settings"), () => this.showSettings(() => this.showTitle()), "btn small", "ui_settings"));
    s.append(row);
    s.append(button(t("title.language"), () => { this.setLocale(i18n.locale === "th" ? "en" : "th"); this.showTitle(); }, "btn small"));
    if (this.loadNote) s.append(el("div", "dim", this.loadNote));
    if (!this.persistent) s.append(el("div", "tag", t("title.no_storage")));
    s.append(el("div", "tag", t("title.build_note")));
    this.ui.append(s);
  }

  showHowTo(): void {
    this.show({ draw: (g) => idleBackground(g) });
    const s = el("div", "screen");
    s.append(el("h2", "", t("howto.title")));
    const card = el("div", "card");
    const ol = el("ol");
    for (let i = 1; i <= 7; i++) ol.append(el("li", "", t(`howto.step${i}`)));
    card.append(ol);
    s.append(card, el("div", "dim", t("howto.controls")), button(t("common.back"), () => this.showTitle(), "btn"));
    this.ui.append(s);
  }

  showSettings(back: () => void, overlay = false): void {
    const st = this.profile.settings;
    const s = el("div", overlay ? "screen overlay" : "screen");
    s.append(el("h2", "", t("settings.title")));
    const card = el("div", "card");
    const toggle = (label: string, value: boolean, set: (v: boolean) => void) => {
      const row = el("label", "toggle");
      const input = el("input");
      input.type = "checkbox"; input.checked = value;
      input.addEventListener("change", () => { set(input.checked); this.save(); });
      row.append(el("span", "", label), input);
      return row;
    };
    const slider = (label: string, value: number, set: (v: number) => void, min = 0, max = 1) => {
      const row = el("label", "toggle");
      const input = el("input");
      input.type = "range"; input.min = String(min); input.max = String(max); input.step = "0.1"; input.value = String(value);
      input.addEventListener("change", () => { set(Number(input.value)); this.save(); });
      row.append(el("span", "", label), input);
      return row;
    };
    card.append(
      toggle(t("settings.auto_lock"), st.autoLock, (v) => (st.autoLock = v)),
      toggle(t("settings.auto_tractor"), st.autoTractor, (v) => (st.autoTractor = v)),
      toggle(t("settings.classic_salvage"), !!st.classicSalvage, (v) => (st.classicSalvage = v)),
      toggle(t("settings.left_handed"), st.handedness === "left", (v) => (st.handedness = v ? "left" : "right")),
      toggle(t("settings.photosensitive"), st.photosensitive, (v) => (st.photosensitive = v)),
      slider(t("settings.sound"), st.sound, (v) => { st.sound = v; sfx.volume = v; }),
      slider(t("settings.shake"), st.shake, (v) => (st.shake = v)),
      slider(t("settings.touch_sensitivity"), st.touchSensitivity ?? 1, (v) => (st.touchSensitivity = v), 0.5, 2),
    );
    s.append(card);
    if (!overlay) {
      const row = el("div", "row");
      row.append(button(t("settings.export"), () => this.exportSave(), "btn small"), button(t("settings.import"), () => this.importSave(), "btn small"));
      s.append(row, el("div", "dim", t("settings.note_assist")));
    }
    s.append(button(t("common.back"), back, "btn"));
    if (overlay) { this.ui.append(s); return; }
    this.show({ draw: (g) => idleBackground(g) });
    this.ui.append(s);
  }

  // Export as copyable text: file downloads are blocked in some embedded hosts.
  private exportSave(): void {
    const o = el("div", "screen overlay");
    const area = el("textarea");
    area.id = "save-export";
    area.readOnly = true;
    area.value = this.repo.exportText(this.profile);
    area.style.cssText = "width:100%;height:420px;font:16px monospace;border-radius:12px;padding:12px";
    const status = el("div", "dim", t("settings.export_hint"));
    o.append(el("h2", "", t("settings.export")), status, area,
      button(t("settings.copy"), () => {
        area.select();
        navigator.clipboard?.writeText(area.value).then(() => (status.textContent = t("settings.copied")), () => (status.textContent = t("settings.copy_manual")));
      }, "btn primary"),
      button(t("common.back"), () => o.remove(), "btn"));
    this.ui.append(o);
  }

  private importSave(): void {
    const o = el("div", "screen overlay");
    const area = el("textarea");
    area.id = "save-import";
    area.placeholder = "RBSAVE …";
    area.style.cssText = "width:100%;height:360px;font:16px monospace;border-radius:12px;padding:12px";
    const file = el("input");
    file.type = "file";
    file.accept = ".txt,text/plain";
    file.addEventListener("change", async () => { const f = file.files?.[0]; if (f) area.value = await f.text(); });
    const apply = () => {
      const res = this.repo.importText(area.value);
      if (res.ok) { this.profile = res.profile; this.setLocale(res.profile.settings.language); this.loadNote = t("settings.import_ok"); }
      else this.loadNote = t("settings.import_bad", { reason: res.error });
      this.showTitle();
    };
    o.append(el("h2", "", t("settings.import")), el("div", "dim", t("settings.import_hint")), area, file,
      button(t("settings.import"), apply, "btn primary"), button(t("common.back"), () => o.remove(), "btn"));
    this.ui.append(o);
  }

  startMission(missionId: string): void {
    this.profile.run_counter += 1; // run ids are never reused
    this.save();
    this.show(() => new CombatScreen(this, this.profile.run_counter, missionId));
  }

  // `before`: the mission's stars before this run (to separate new / previous / missed).
  showResults(world: CombatWorld, s: Settlement, before?: readonly boolean[]): void {
    const r = world.result!;
    const o = el("div", "screen overlay");
    o.append(el("h2", "", r.victory ? t("results.victory") : t("results.defeat")));
    if (world.mission) o.append(el("div", "dim", t(`missions.${world.mission.id}.name`)));
    const card = el("div", "card");
    if (world.mission) card.append(resultStars(world.mission, before, r.victory ? r.stars ?? null : null));
    if (!r.victory && world.mission) card.append(el("div", "dim", t("results.stars_need_clear")));
    if (world.boss) {
      const bid = world.boss.row.id, sig = world.boss.row.signature_weapon_id;
      const pre = world.boss.hintPrefix === "tail" ? "" : "claw_"; // results.* (B02) / results.claw_* (B01)
      const stolen = r.stolen.includes(bid);
      card.append(el("p", "", stolen ? t(`results.${pre}stolen`) : r.severed.includes(bid) ? t(`results.${pre}severed_lost`) : t(`results.${pre}not_stolen`)));
      const frag = this.profile.blueprint_fragments[sig] ?? 0;
      const fr = el("div", "frag");
      const bp = icon("ui_blueprint");
      if (bp) fr.append(bp);
      fr.append(el("span", "", `${t(`weapons.${sig}.name`)} `));
      for (let i = 0; i < 3; i++) fr.append(el("i", i < frag ? "on" : ""));
      fr.append(el("span", "dim", ` ${Math.min(frag, 3)}/3 ${s.fragments[sig] ? "+1" : ""}`));
      card.append(fr);
      if (s.fallbackFragments.length) card.append(el("div", "dim", t("results.fallback")));
      if (frag >= 3) card.append(el("div", "tag", t("results.blueprint_ready")));
    }
    for (const [id, n] of Object.entries(s.research)) card.append(el("div", "tag", t("results.research", { name: t(`weapons.${id}.name`), n })));
    card.append(statRow(t("results.credits"), `+${s.credits}${s.firstClear ? ` (${t("results.first_clear")})` : ""}`, "ui_credits"),
      statRow(t("results.scrap"), `+${s.scrap}`, "ui_scrap"), statRow(t("results.score"), r.score));
    o.append(card);
    const row = el("div", "row");
    row.append(button(t("results.again"), () => this.startMission(r.missionId), "btn primary"), button(t("results.map"), () => showSectorMap(this), "btn"));
    o.append(row);
    this.ui.append(o);
  }
}

// BATCH_006 menu icon as an <img>, or null while the sprite is missing.
export function icon(id: string, cls = "ico"): HTMLImageElement | null {
  const url = spriteUrl(id);
  if (!url) return null;
  const img = el("img", cls);
  img.src = url;
  img.alt = "";
  return img;
}

function statRow(label: string, value: string | number, iconId?: string): HTMLElement {
  const d = el("div", "stat");
  const l = el("span", "", label);
  const ico = iconId ? icon(iconId) : null;
  if (ico) l.prepend(ico);
  d.append(l, el("b", "", String(value)));
  return d;
}

let idleT = 0;
function idleBackground(g: CanvasRenderingContext2D): void {
  idleT += 1 / 60;
  g.fillStyle = "#0b1424"; g.fillRect(0, 0, 720, 1280);
  for (let i = 0; i < 90; i++) {
    const x = (i * 97) % 720, y = (i * 233 + idleT * (20 + (i % 3) * 25)) % 1280;
    g.fillStyle = `rgba(159,184,200,${0.2 + (i % 3) * 0.2})`; g.fillRect(x, y, 2, 2);
  }
}

// ------------------------------------------------------------------ combat
const KEYS_MOVE: Record<string, Vec> = {
  KeyW: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 }, ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 }, ArrowRight: { x: 1, y: 0 },
};
// (relative drag is applied 1:1 per tick — see PlayerMotion.step `direct`)
const TAP_MAX_SEC = 0.25;
const TAP_MAX_PX = 16;

export class CombatScreen implements Screen {
  world: CombatWorld;
  driver = new FrameDriver();
  renderer: Renderer;
  buttons: HudButton[];
  paused = false;
  private keys = new Set<string>();
  private drag: { id: number; accum: Vec; start: Vec; last: Vec; t0: number } | null = null;
  private pointerButtons = new Map<number, HudAction>();
  private pending = { dash: false, overdrive: false, tractorTap: false };
  private keyTractor = false;
  private padPrev: boolean[] = [];
  private hintEl: HTMLElement;
  private hintQueue: string[] = [];
  private hintTimer = 0;
  private dock: DockPanel | null = null;
  private endTimer = -1;
  private finished = false;
  private pauseEl: HTMLElement | null = null;
  private now = 0;
  private off: (() => void)[] = [];
  // Time-stopping tutorial callouts, shown each run until the first successful steal.
  private callout: HTMLElement | null = null;
  private tutorialShown = new Set<string>();
  private tutorialOn: boolean;

  constructor(private app: App, runNumber: number, missionId: string) {
    const st = app.profile.settings;
    this.world = new CombatWorld(app.catalog, { seed: 1000 + runNumber * 7919, runId: `run${runNumber}`, autoLock: st.autoLock, autoTractor: st.autoTractor,
      missionId, researchPool: researchPool(app.catalog, app.profile), salvageMode: st.classicSalvage ? "classic" : "quick" });
    this.renderer = new Renderer(app.g);
    this.buttons = layoutButtons(app.insets, st.handedness);
    this.hintEl = el("div", "hidden");
    this.hintEl.id = "hint";
    app.ui.append(this.hintEl);
    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: K, fn: (e: WindowEventMap[K]) => void) => {
      target.addEventListener(type, fn as EventListener);
      this.off.push(() => target.removeEventListener(type, fn as EventListener));
    };
    on(app.canvas, "pointerdown", (e) => this.pointerDown(e));
    on(app.canvas, "pointermove", (e) => this.pointerMove(e));
    on(app.canvas, "pointerup", (e) => this.pointerUp(e));
    on(app.canvas, "pointercancel", (e) => this.pointerUp(e));
    on(app.canvas, "contextmenu", (e) => e.preventDefault());
    on(window, "keydown", (e) => this.keyDown(e));
    on(window, "keyup", (e) => { this.keys.delete(e.code); if (e.code === "KeyE") this.keyTractor = false; });
    on(window, "blur", () => { this.keys.clear(); this.keyTractor = false; });
    this.world.hint("hint.intro");
    this.tutorialOn = true; // decided per boss once it appears (until that boss's first steal)
  }

  dispose(): void { for (const f of this.off) f(); this.dock?.close(); this.callout?.remove(); }
  onHidden(): void { this.setPaused(true); }

  // ---------------------------------------------------------- input
  private pointerDown(e: PointerEvent): void {
    e.preventDefault();
    if (this.paused || this.dock) return;
    const p = this.app.toLogical(e.clientX, e.clientY);
    const action = hitTest(this.buttons, p, this.world);
    this.app.canvas.setPointerCapture?.(e.pointerId);
    if (action) {
      this.pointerButtons.set(e.pointerId, action);
      this.trigger(action);
      return;
    }
    if (!this.drag) this.drag = { id: e.pointerId, accum: { x: 0, y: 0 }, start: p, last: p, t0: this.now };
  }

  private pointerMove(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    // Relative drag from position deltas (movementX is unreliable for touch pointers).
    const p = this.app.toLogical(e.clientX, e.clientY);
    const k = this.app.profile.settings.touchSensitivity ?? 1;
    this.drag.accum = { x: this.drag.accum.x + (p.x - this.drag.last.x) * k, y: this.drag.accum.y + (p.y - this.drag.last.y) * k };
    // Never let a backlog build up (e.g. while pushing into a wall): keep at most ~0.25 s of travel.
    this.drag.accum = limitLength(this.drag.accum, 260);
    this.drag.last = p;
  }

  private pointerUp(e: PointerEvent): void {
    this.pointerButtons.delete(e.pointerId);
    if (this.drag?.id !== e.pointerId) return;
    const p = this.app.toLogical(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - this.drag.start.x, p.y - this.drag.start.y);
    if (this.now - this.drag.t0 <= TAP_MAX_SEC && moved <= TAP_MAX_PX && this.world.lockAt(p)) sfx.play("lock");
    this.drag = null;
  }

  private keyDown(e: KeyboardEvent): void {
    if (e.code === "Escape" || e.code === "KeyP") { this.setPaused(!this.paused); return; }
    if (this.paused || this.dock) return;
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "Space") { this.pending.dash = true; e.preventDefault(); }
    if (e.code === "KeyR") this.pending.overdrive = true;
    if (e.code === "KeyE") { this.keyTractor = true; this.pending.tractorTap = true; }
    if (e.code === "KeyF" || e.code === "Tab") { this.world.cycleLock(); e.preventDefault(); sfx.play("lock"); }
  }

  private trigger(a: HudAction): void {
    if (a === "pause") this.setPaused(true);
    else if (a === "dash") this.pending.dash = true;
    else if (a === "overdrive") this.pending.overdrive = true;
    else if (a === "tractor") this.pending.tractorTap = true;
  }

  private pollPad(): { move: Vec; tractor: boolean } {
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    if (!pad) return { move: { x: 0, y: 0 }, tractor: false };
    const dz = (v: number) => (Math.abs(v) < 0.2 ? 0 : v);
    const pressed = pad.buttons.map((b) => b.pressed);
    const edge = (i: number) => pressed[i] && !this.padPrev[i];
    if (edge(0)) this.pending.dash = true;
    if (edge(3)) this.pending.overdrive = true;
    if (edge(5)) this.pending.tractorTap = true;
    if (edge(4)) this.world.cycleLock();
    if (edge(9)) this.setPaused(!this.paused);
    this.padPrev = pressed;
    return { move: { x: dz(pad.axes[0] ?? 0), y: dz(pad.axes[1] ?? 0) }, tractor: !!pressed[5] };
  }

  private moveInput(pad: Vec): Vec {
    let k = { x: 0, y: 0 };
    for (const code of this.keys) { const d = KEYS_MOVE[code]; if (d) k = { x: k.x + d.x, y: k.y + d.y }; }
    if (k.x || k.y) return limitLength(k, 1);
    if (pad.x || pad.y) return limitLength(pad, 1);
    return { x: 0, y: 0 };
  }

  // Relative drag for one tick: the finger's movement since the last tick, up to the
  // ship's touch speed cap; anything beyond carries to the next tick so the ship catches up.
  private consumeDrag(): Vec | undefined {
    if (!this.drag || this.keys.size) return undefined;
    const cap = this.world.motion.effectiveSpeed() * TOUCH_SPEED_MULT * DT;
    const step = limitLength(this.drag.accum, cap);
    this.drag.accum = { x: this.drag.accum.x - step.x, y: this.drag.accum.y - step.y };
    return step;
  }

  setPaused(v: boolean): void {
    if (this.world.status !== "running" || this.dock || this.callout) v = false;
    this.paused = v;
    this.driver.paused = v;
    this.drag = null;
    this.pointerButtons.clear();
    this.pending = { dash: false, overdrive: false, tractorTap: false };
    this.pauseEl?.remove();
    this.pauseEl = null;
    if (!v) return;
    const o = el("div", "screen overlay");
    o.append(el("h2", "", t("pause.title")),
      button(t("pause.resume"), () => this.setPaused(false), "btn primary", "ui_play"),
      button(t("title.settings"), () => { o.remove(); this.app.showSettings(() => { this.applySettings(); this.setPaused(true); }, true); }, "btn", "ui_settings"),
      button(t("pause.quit"), () => showSectorMap(this.app), "btn"),
      el("div", "dim", t("pause.quit_note")));
    this.pauseEl = o;
    this.app.ui.append(o);
  }

  private applySettings(): void {
    const st = this.app.profile.settings;
    this.world.opts.autoLock = st.autoLock;
    this.world.opts.autoTractor = st.autoTractor;
    this.buttons = layoutButtons(this.app.insets, st.handedness);
    for (const c of [...this.app.ui.children]) if (c.classList.contains("overlay")) c.remove();
  }

  // ---------------------------------------------------------- loop
  update(dt: number): void {
    this.now += dt;
    const w = this.world;
    const pad = this.pollPad();
    const running = w.status === "running" && !w.dock && !this.paused && !this.callout;
    this.driver.paused = !running;
    const ticks = this.driver.advance(dt);
    for (let i = 0; i < ticks; i++) {
      const held = [...this.pointerButtons.values()].includes("tractor") || this.keyTractor || pad.tractor;
      w.step({ move: this.moveInput(pad.move), drag: this.consumeDrag(), dash: this.pending.dash, overdrive: this.pending.overdrive,
        tractorHeld: held, tractorTap: this.pending.tractorTap, fire: true });
      this.pending = { dash: false, overdrive: false, tractorTap: false };
    }
    const settings = this.app.profile.settings;
    for (const e of w.events) { this.renderer.spawn(e, settings); playCue(e); }
    w.events.length = 0;
    this.renderer.update(running ? dt : 0);
    this.updateHints(dt);
    this.checkTutorial();
    if (w.dock && !this.dock) {
      sfx.play("secured");
      this.dock = new DockPanel(this.app, w, () => { this.dock = null; });
    }
    // Results open exactly once (the timer used to re-arm after finishing).
    if (w.status !== "running" && !this.finished) {
      if (this.endTimer < 0) this.endTimer = 1.4;
      this.endTimer -= dt;
      if (this.endTimer <= 0) { this.finished = true; this.finish(); }
    }
  }

  private checkTutorial(): void {
    const w = this.world;
    const b = w.boss;
    if (!this.tutorialOn || this.callout || !b || w.status !== "running") return;
    if (this.app.profile.boss_archive[b.row.id]?.stolen > 0) { this.tutorialOn = false; return; }
    if (b.jointExposed && !this.tutorialShown.has("joint")) {
      const p = { x: b.e.pos.x + b.joint.offset.x, y: b.e.pos.y + b.joint.offset.y };
      this.showCallout("joint", p, 46, () => { w.lock = { enemyId: b.e.id, partId: b.joint.id }; });
    } else if (b.item.state === "detached_intact" && !this.tutorialShown.has("tow")) {
      this.showCallout("tow", { ...b.item.pos }, 50);
    } else if (!w.quickSalvage && w.tow?.towing && !this.tutorialShown.has("towing")) {
      const it = w.towedItem!;
      this.showCallout("towing", { ...it.pos }, 50);
    }
  }

  private showCallout(kind: "joint" | "tow" | "towing", focus: Vec, r: number, onOk?: () => void): void {
    this.tutorialShown.add(kind);
    this.drag = null;
    this.pointerButtons.clear();
    // tut.* texts talk about the B02 tail; tut.claw_* about the B01 claw
    const pre = kind === "tow" && this.world.quickSalvage ? "quick_" : this.world.boss?.hintPrefix === "claw" ? "claw_" : "";
    this.renderer.focus = { p: focus, r, label: kind === "towing" ? "" : t(`tut.${pre}${kind}_focus`) };
    const box = el("div", "callout");
    box.append(el("h3", "", t(`tut.${pre}${kind}_title`)), el("p", "", t(`tut.${pre}${kind}_body`)),
      button(t("tut.ok"), () => { onOk?.(); box.remove(); this.callout = null; this.renderer.focus = null; }, "btn primary"));
    // keep the box away from the highlighted target
    box.style.top = focus.y < 640 ? "760px" : "300px";
    this.callout = box;
    this.app.ui.append(box);
    sfx.play("warn");
  }

  private updateHints(dt: number): void {
    const w = this.world;
    while (w.hints.length) this.hintQueue.push(w.hints.shift()!);
    this.hintTimer -= dt;
    if (this.hintTimer <= 0) {
      const next = this.hintQueue.shift();
      if (next) { this.hintEl.textContent = t(next); this.hintEl.className = ""; this.hintTimer = 4.2; }
      else this.hintEl.className = "hidden";
    }
    // Hints sit under the boss bar, above the boss (which flies lower) and away from the ship.
    this.hintEl.style.top = `${this.app.insets.top + 166}px`;
  }

  private finish(): void {
    const app = this.app;
    const r = this.world.result!;
    const before = app.profile.mission_records[r.missionId]?.stars.slice();
    const s = computeSettlement(app.profile, r, (id) => app.catalog.row<{ signature_weapon_id: string }>("bosses", id)?.signature_weapon_id ?? "");
    settle(app.profile, s, (p) => app.repo.save(p));
    this.hintEl.className = "hidden";
    app.showResults(this.world, s, before);
  }

  draw(g: CanvasRenderingContext2D): void {
    this.renderer.draw(this.world, this.driver.alpha());
    drawHud(g, this.world, this.buttons, this.app.insets, new Set(this.pointerButtons.values()), this.renderer.time);
    this.renderer.drawFocus();
  }
}

function playCue(e: GameEvent): void {
  switch (e.type) {
    case "muzzle": sfx.play(e.family === "beam" ? "beam" : e.family === "plasma" ? "plasma" : "shot"); break;
    case "hit": sfx.play("hit"); break;
    case "deflect": sfx.play("deflect"); break;
    case "kill": sfx.play("boom"); break;
    case "blast": sfx.play("boom"); break;
    case "joint_break": sfx.play("joint"); break;
    case "sever": sfx.play("sever"); break;
    case "tractor_lock": sfx.play("tractor"); break;
    case "player_hit": sfx.play("hurt"); break;
    case "shield_hit": sfx.play("shield"); break;
    case "dash": sfx.play("dash"); break;
    case "overdrive": sfx.play("overdrive"); break;
    case "phase": sfx.play("warn"); break;
    case "boss_dead": sfx.play("big_boom"); break;
    case "scrap": case "snap": case "module_lost": sfx.play("deflect"); break;
  }
}

export function boot(stage: HTMLElement, canvas: HTMLCanvasElement, ui: HTMLElement): App | null {
  const catalog = loadCatalog();
  if (!catalog.valid) {
    ui.textContent = `Catalog validation failed:\n${catalog.errors.join("\n")}`;
    return null;
  }
  setI18n(new I18n(catalog));
  preloadSprites(); // decode art while the title screen is up
  const { store, persistent } = safeStorage();
  const repo = new SaveRepository(store);
  const loaded = repo.load();
  const profile = loaded.profile;
  const app = new App(stage, canvas, ui, catalog, repo, profile, persistent);
  i18n.locale = profile.settings.language;
  document.documentElement.lang = i18n.locale;
  sfx.volume = profile.settings.sound;
  const notes: Record<LoadStatus, string> = {
    [LoadStatus.OK]: "", [LoadStatus.NEW]: "", [LoadStatus.RECOVERED]: t("save.recovered"),
    [LoadStatus.FUTURE]: t("save.future"), [LoadStatus.CORRUPT]: t("save.corrupt"),
  };
  app.loadNote = notes[loaded.status];
  if (recoverPending(profile)) app.loadNote = t("save.recovered_settlement");
  if (loaded.status !== LoadStatus.OK && loaded.status !== LoadStatus.FUTURE) app.save();
  else if (app.loadNote === t("save.recovered_settlement")) app.save();
  app.showTitle();
  (window as unknown as { __rb?: App }).__rb = app; // dev/test hook (read-only use in capture scripts)
  return app;
}
