// Local persistence (AGENTS §12): "RBSAVE <crc32-of-payload>" header line + JSON.
// The checksum detects corruption only; it is not anti-cheat. Progress is never
// deleted: unreadable copies are kept aside, newer-schema saves block all writes.
import { CONTENT_VERSION, CURRENT_SCHEMA, defaultProfile, defaultSettings, type Profile } from "./profile";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  failWrites = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, val: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.data.set(k, val);
  }
  removeItem(k: string) { this.data.delete(k); }
}

export enum LoadStatus { OK = "ok", NEW = "new", RECOVERED = "recovered", FUTURE = "future", CORRUPT = "corrupt" }
const MAGIC = "RBSAVE";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function serialize(p: Profile): string {
  const payload = JSON.stringify(p);
  return `${MAGIC} ${crc32(payload)}\n${payload}`;
}

export type ParseResult = { ok: true; profile: Profile; schema: number } | { ok: false; error: string; schema?: number };

export function parseSave(text: string): ParseResult {
  const nl = text.indexOf("\n");
  if (nl < 0) return { ok: false, error: "missing header" };
  const [magic, sum] = text.slice(0, nl).split(" ");
  const payload = text.slice(nl + 1);
  if (magic !== MAGIC || !sum) return { ok: false, error: "bad header" };
  if (crc32(payload) !== sum) return { ok: false, error: "checksum mismatch" };
  let data: unknown;
  try { data = JSON.parse(payload); } catch { return { ok: false, error: "payload not JSON" }; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "payload not an object" };
  const schema = Number((data as Record<string, unknown>).schema_version ?? -1);
  if (schema > CURRENT_SCHEMA) return { ok: false, error: "future_schema", schema };
  if (!(schema >= 0)) return { ok: false, error: "missing schema_version" };
  const profile = migrate(data as Record<string, unknown>);
  const problems = validateProfile(profile);
  if (problems.length) return { ok: false, error: `invalid: ${problems.join(", ")}` };
  return { ok: true, profile, schema };
}

// Applies migrations in order; unknown keys are preserved untouched.
export function migrate(data: Record<string, unknown>): Profile {
  const p = structuredClone(data) as Record<string, unknown>;
  let ver = Number(p.schema_version ?? 0);
  while (ver < CURRENT_SCHEMA) {
    if (ver === 0) migrate0to1(p);
    ver++;
    p.schema_version = ver;
  }
  const d = defaultProfile() as unknown as Record<string, unknown>;
  for (const k of ["test_records", "boss_archive", "run_counter"]) if (!(k in p)) p[k] = d[k];
  p.settings = { ...defaultSettings(), ...((p.settings as object) ?? {}) };
  return p as unknown as Profile;
}

// Schema 0 = pre-release profile without the settlement journal or loadouts.
function migrate0to1(p: Record<string, unknown>): void {
  const d = defaultProfile() as unknown as Record<string, unknown>;
  for (const k of ["settings", "mission_records", "unlocked_hulls", "blueprint_fragments", "weapon_research", "loadouts", "applied_settlements", "profile_id"]) {
    if (!(k in p)) p[k] = d[k];
  }
  if (!("active_run" in p)) p.active_run = null;
  if (!("pending_settlement" in p)) p.pending_settlement = null;
  if (!("content_version" in p)) p.content_version = CONTENT_VERSION;
}

export function validateProfile(p: Profile): string[] {
  const problems: string[] = [];
  const isObj = (x: unknown) => !!x && typeof x === "object" && !Array.isArray(x);
  if (p.schema_version !== CURRENT_SCHEMA) problems.push("schema_version");
  if (!p.profile_id) problems.push("profile_id");
  for (const k of ["credits", "scrap"] as const) if (!Number.isInteger(p[k]) || p[k] < 0) problems.push(k);
  if (!isObj(p.settings)) problems.push("settings");
  if (!isObj(p.mission_records)) problems.push("mission_records");
  else for (const [id, r] of Object.entries(p.mission_records)) if (!Array.isArray(r?.stars) || r.stars.length !== 3) problems.push(`mission_records.${id}`);
  if (!Array.isArray(p.unlocked_hulls) || !p.unlocked_hulls.includes("H01")) problems.push("unlocked_hulls");
  for (const k of ["blueprint_fragments", "weapon_research", "boss_archive", "test_records"] as const) if (!isObj(p[k])) problems.push(k);
  for (const k of ["loadouts", "applied_settlements"] as const) if (!Array.isArray(p[k])) problems.push(k);
  return problems;
}

export class SaveRepository {
  writeBlocked = false;
  lastError = "";

  constructor(private store: KeyValueStore, readonly slot = "rb.slot0") {}

  key(kind: "main" | "bak1" | "bak2" | "tmp"): string {
    return kind === "main" ? this.slot : `${this.slot}.${kind}`;
  }

  load(): { status: LoadStatus; profile: Profile } {
    this.writeBlocked = false;
    this.lastError = "";
    let anyFound = false;
    const order = ["main", "bak1", "bak2"] as const;
    for (let i = 0; i < order.length; i++) {
      const text = this.read(this.key(order[i]));
      if (text === null) continue;
      anyFound = true;
      const parsed = parseSave(text);
      if (!parsed.ok && parsed.error === "future_schema") {
        this.writeBlocked = true;
        this.lastError = `save schema ${parsed.schema} is newer than supported ${CURRENT_SCHEMA}`;
        return { status: LoadStatus.FUTURE, profile: defaultProfile() };
      }
      if (parsed.ok) return { status: i === 0 ? LoadStatus.OK : LoadStatus.RECOVERED, profile: parsed.profile };
      this.lastError = `${order[i]}: ${parsed.error}`;
      this.preserveCorrupt(this.key(order[i]), text);
    }
    return { status: anyFound ? LoadStatus.CORRUPT : LoadStatus.NEW, profile: defaultProfile() };
  }

  // tmp write → verify → rotate valid snapshots → replace main → drop tmp.
  save(p: Profile): boolean {
    if (this.writeBlocked) { this.lastError = "write blocked: on-disk save is from a newer version"; return false; }
    const problems = validateProfile(p);
    if (problems.length) { this.lastError = `refusing to write invalid profile: ${problems.join(", ")}`; return false; }
    const text = serialize(p);
    try {
      this.store.setItem(this.key("tmp"), text);
      if (this.read(this.key("tmp")) !== text) throw new Error("verify failed");
      const main = this.read(this.key("main"));
      if (main !== null) {
        if (parseSave(main).ok) {
          const bak1 = this.read(this.key("bak1"));
          if (bak1 !== null) this.store.setItem(this.key("bak2"), bak1);
          this.store.setItem(this.key("bak1"), main);
        } else this.preserveCorrupt(this.key("main"), main);
      }
      this.store.setItem(this.key("main"), text);
      this.store.removeItem(this.key("tmp"));
      return true;
    } catch (e) {
      this.lastError = `write failed: ${(e as Error).message}`;
      return false;
    }
  }

  exportText(p: Profile): string { return serialize(p); }

  importText(text: string): { ok: true; profile: Profile } | { ok: false; error: string } {
    const parsed = parseSave(text.trim());
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (!this.save(parsed.profile)) return { ok: false, error: this.lastError };
    return { ok: true, profile: parsed.profile };
  }

  private read(k: string): string | null {
    try { return this.store.getItem(k); } catch { return null; }
  }

  private preserveCorrupt(k: string, text: string): void {
    try {
      if (this.read(`${k}.corrupt`) === null) this.store.setItem(`${k}.corrupt`, text);
    } catch { /* storage full: leave original untouched */ }
  }
}
