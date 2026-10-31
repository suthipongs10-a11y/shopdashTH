// Hangar screen: spend credits on permanent upgrades and choose the extra gun to launch with.
import { buyUpgrade, equippableWeapons, levels, upgradeCost, UPGRADES } from "../campaign/upgrades";
import { i18n, t } from "../core/i18n";
import { sfx } from "../audio/sfx";
import { button, el, icon, type App } from "./app";

export function showHangar(app: App, note = ""): void {
  const p = app.profile;
  app.show({ draw: (g) => { g.fillStyle = "#08121f"; g.fillRect(0, 0, 720, 1280); } });
  const s = el("div", "screen hangar");
  const h = el("h2", "", t("hangar.title"));
  const hi = icon("ui_hangar");
  if (hi) h.prepend(hi);
  s.append(h);
  const wallet = el("div", "wallet");
  const ci = icon("ui_credits");
  if (ci) wallet.append(ci);
  wallet.append(el("b", "", String(p.credits)), el("span", "dim", ` ${t("title.credits")}`));
  s.append(wallet);
  if (note) s.append(el("div", note.startsWith("hangar.error") ? "err" : "tag", t(note)));
  const list = el("div", "upgrades");
  const lv = levels(p);
  const loc = i18n.locale;
  for (const u of UPGRADES) {
    const cur = lv[u.id] ?? 0;
    const row = el("div", "upg");
    const info = el("div", "body");
    info.append(el("b", "", u.name[loc]), el("small", "", u.per[loc]));
    const pips = el("span", "pips");
    for (let i = 0; i < u.max; i++) pips.append(el("i", i < cur ? "on" : ""));
    info.append(pips);
    const maxed = cur >= u.max;
    const cost = upgradeCost(u, cur);
    const buy = button(maxed ? t("hangar.max") : `${cost}`, () => {
      const err = buyUpgrade(p, u.id);
      if (!err) { sfx.play("secured"); app.save(); }
      showHangar(app, err ?? "hangar.bought");
    }, "btn small buy", maxed ? undefined : "ui_credits");
    buy.disabled = maxed || p.credits < cost;
    row.append(info, buy);
    list.append(row);
  }
  s.append(list);
  // extra starting gun
  const eq = equippableWeapons(app.catalog, p);
  const card = el("div", "card");
  card.append(el("div", "dim", t("hangar.loadout")));
  if (!eq.length) card.append(el("div", "dim", t("hangar.loadout_none")));
  const sel = el("div", "loadout");
  for (const id of [null, ...eq]) {
    const on = (p.equipped_weapon ?? null) === id;
    const b = el("button", `chip${on ? " on" : ""}`, id ? t(`weapons.${id}.name`) : t("hangar.loadout_off"));
    const wi = id ? icon(`weapon_${id}_icon`) : null;
    if (wi) b.prepend(wi);
    b.addEventListener("click", () => { p.equipped_weapon = id; app.save(); sfx.play("ui"); showHangar(app); });
    sel.append(b);
  }
  if (eq.length) card.append(sel);
  s.append(card, el("div", "dim", t("hangar.tip")));
  s.append(button(t("common.back"), () => app.showTitle(), "btn"));
  app.ui.append(s);
}
