// Hangar: permanent upgrades bought with credits, and the extra gun the ship launches
// with (owner: progress must mean something between runs). Pure rules + profile helpers.
import type { Catalog } from "../core/catalog";
import type { Names } from "../core/types";
import type { Profile } from "../save/profile";

export interface UpgradeDef { id: string; name: Names; per: Names; max: number; base: number }

export const UPGRADES: UpgradeDef[] = [
  { id: "hull", name: { th: "เกราะตัวยาน", en: "Hull plating" }, per: { th: "+20 พลังชีวิต", en: "+20 HP" }, max: 5, base: 120 },
  { id: "shield", name: { th: "เครื่องสร้างโล่", en: "Shield emitter" }, per: { th: "+10 โล่", en: "+10 shield" }, max: 5, base: 120 },
  { id: "guns", name: { th: "หัวรบเสริมแรง", en: "Hardened rounds" }, per: { th: "+8% ความแรงทุกปืน", en: "+8% damage, all guns" }, max: 5, base: 180 },
  { id: "feed", name: { th: "ระบบป้อนกระสุน", en: "Ammo feed" }, per: { th: "+6% อัตรายิง", en: "+6% fire rate" }, max: 5, base: 160 },
  { id: "reactor", name: { th: "เตาปฏิกรณ์", en: "Reactor" }, per: { th: "+15% ฟื้นพลังงาน", en: "+15% energy regen" }, max: 4, base: 140 },
  { id: "thrusters", name: { th: "เครื่องยนต์", en: "Thrusters" }, per: { th: "+5% ความเร็ว", en: "+5% speed" }, max: 4, base: 120 },
  { id: "tractor", name: { th: "ลำแสงดึง", en: "Tractor beam" }, per: { th: "+25% ระยะดึงชิ้นส่วน", en: "+25% grab range" }, max: 3, base: 100 },
];

export const upgradeCost = (u: UpgradeDef, level: number): number => Math.round(u.base * (1 + level * 0.75));

export interface ShipMods {
  hpBonus: number; shieldBonus: number; damageMul: number; rateMul: number;
  regenMul: number; speedMul: number; pullMul: number; extraWeapon: string | null;
}

export const NO_MODS: ShipMods = { hpBonus: 0, shieldBonus: 0, damageMul: 1, rateMul: 1, regenMul: 1, speedMul: 1, pullMul: 1, extraWeapon: null };

export function levels(p: Profile): Record<string, number> {
  return (p.upgrades as Record<string, number> | undefined) ?? {};
}

export function shipMods(p: Profile): ShipMods {
  const l = levels(p);
  const lv = (id: string) => l[id] ?? 0;
  return {
    hpBonus: 20 * lv("hull"), shieldBonus: 10 * lv("shield"), damageMul: 1 + 0.08 * lv("guns"), rateMul: 1 + 0.06 * lv("feed"),
    regenMul: 1 + 0.15 * lv("reactor"), speedMul: 1 + 0.05 * lv("thrusters"), pullMul: 1 + 0.25 * lv("tractor"),
    extraWeapon: (p.equipped_weapon as string | null | undefined) ?? null,
  };
}

// Returns an error key, or null when bought.
export function buyUpgrade(p: Profile, id: string): string | null {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return "hangar.error.unknown";
  const l = levels(p);
  const lv = l[id] ?? 0;
  if (lv >= u.max) return "hangar.error.max";
  const cost = upgradeCost(u, lv);
  if (p.credits < cost) return "hangar.error.credits";
  p.credits -= cost;
  p.upgrades = { ...l, [id]: lv + 1 };
  return null;
}

// Guns the ship can launch with: any weapon brought home intact at least once (research),
// plus boss signatures whose blueprint is complete (3 fragments).
export function equippableWeapons(c: Catalog, p: Profile): string[] {
  return c.raw.weapons.filter((w) =>
    (w.source === "research" && w.unlock !== "starter" && (p.weapon_research[w.id] ?? 0) > 0) ||
    (w.source === "boss_signature" && (p.blueprint_fragments[w.id] ?? 0) >= 3)).map((w) => w.id);
}
