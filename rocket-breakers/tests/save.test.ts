import { describe, expect, it } from "vitest";
import { LoadStatus, MemoryStore, SaveRepository, crc32, parseSave } from "../src/save/saveRepository";
import { CURRENT_SCHEMA, defaultProfile } from "../src/save/profile";

const fresh = () => { const store = new MemoryStore(); return { store, repo: new SaveRepository(store) }; };

describe("save repository", () => {
  it("new → save → reload keeps progress and profile id", () => {
    const { store, repo } = fresh();
    const first = repo.load();
    expect(first.status).toBe(LoadStatus.NEW);
    const p = first.profile;
    p.credits = 500; p.blueprint_fragments.W022 = 1; p.settings.language = "en";
    expect(repo.save(p)).toBe(true);
    const again = new SaveRepository(store).load();
    expect(again.status).toBe(LoadStatus.OK);
    expect(again.profile).toMatchObject({ credits: 500, profile_id: p.profile_id });
    expect(again.profile.blueprint_fragments.W022).toBe(1);
    expect(again.profile.settings.language).toBe("en");
  });
  it("keeps two valid rotating backups and recovers from a corrupt main", () => {
    const { store, repo } = fresh();
    const p = defaultProfile();
    for (const c of [10, 20, 30]) { p.credits = c; repo.save(p); }
    const val = (k: string) => { const r = parseSave(store.getItem(k)!); return r.ok ? r.profile.credits : -1; };
    expect([val("rb.slot0"), val("rb.slot0.bak1"), val("rb.slot0.bak2")]).toEqual([30, 20, 10]);
    store.setItem("rb.slot0", "RBSAVE 00000000\n{broken");
    const res = repo.load();
    expect(res.status).toBe(LoadStatus.RECOVERED);
    expect(res.profile.credits).toBe(20);
    expect(store.getItem("rb.slot0.corrupt")).not.toBeNull();
  });
  it("all copies corrupt → fresh profile, originals preserved", () => {
    const { store, repo } = fresh();
    store.setItem("rb.slot0", "garbage");
    const res = repo.load();
    expect(res.status).toBe(LoadStatus.CORRUPT);
    expect(store.getItem("rb.slot0")).toBe("garbage");
  });
  it("future schema is rejected and never overwritten", () => {
    const { store, repo } = fresh();
    const payload = JSON.stringify({ ...defaultProfile(), schema_version: 99 });
    const text = `RBSAVE ${crc32(payload)}\n${payload}`;
    store.setItem("rb.slot0", text);
    expect(repo.load().status).toBe(LoadStatus.FUTURE);
    expect(repo.save(defaultProfile())).toBe(false);
    expect(store.getItem("rb.slot0")).toBe(text);
  });
  it("migrates schema 0 and preserves unknown keys", () => {
    const { store, repo } = fresh();
    const payload = JSON.stringify({ schema_version: 0, profile_id: "legacy", credits: 5, scrap: 1, unlocked_hulls: ["H01"], mission_records: {}, archived_token: { keep: true } });
    store.setItem("rb.slot0", `RBSAVE ${crc32(payload)}\n${payload}`);
    const res = repo.load();
    expect(res.status).toBe(LoadStatus.OK);
    expect(res.profile.schema_version).toBe(CURRENT_SCHEMA);
    expect(res.profile.archived_token).toEqual({ keep: true });
    expect(res.profile.applied_settlements).toEqual([]);
  });
  it("export/import round trip; bad import and write failure keep the current save", () => {
    const { store, repo } = fresh();
    const p = defaultProfile();
    p.scrap = 42;
    repo.save(p);
    const other = fresh();
    expect(other.repo.importText(repo.exportText(p)).ok).toBe(true);
    expect(other.repo.load().profile.scrap).toBe(42);
    expect(repo.importText("RBSAVE 0\n{}").ok).toBe(false);
    store.failWrites = true;
    p.scrap = 99;
    expect(repo.save(p)).toBe(false);
    store.failWrites = false;
    expect(repo.load().profile.scrap).toBe(42);
    const neg = defaultProfile();
    neg.credits = -1;
    expect(repo.save(neg)).toBe(false);
  });
});
