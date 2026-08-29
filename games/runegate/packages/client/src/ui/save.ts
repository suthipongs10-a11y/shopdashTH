/**
 * ที่เก็บสถานะผู้เล่นในเครื่อง — เป็นเปลือกบางๆ ครอบ `@runegate/meta`
 * ตรรกะทั้งหมดอยู่ใน meta (pure) ที่นี่มีแค่ localStorage + การย้ายเซฟเก่า
 * Phase 5: เปลี่ยน read/write ให้คุยกับ server แล้วหน้าจอทั้งหมดใช้ต่อได้เลย
 */
import { createInitialState, migrateState, type MetaResult, type PlayerState } from '@runegate/meta';

const KEY = 'runegate_save_v2';
const LEGACY_KEY = 'runegate_progress_v1';

let cache: PlayerState | null = null;

function load(): PlayerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrateState(JSON.parse(raw));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return fromLegacy(JSON.parse(legacy) as LegacySave);
  } catch {
    /* เซฟเสีย/เข้าถึงไม่ได้ — เริ่มใหม่ดีกว่าเปิดเกมไม่ได้ */
  }
  return createInitialState();
}

interface LegacySave {
  stars?: Record<string, number>;
  squad?: string[];
  level?: number;
}

/** เซฟยุค Phase 2 มีแค่ ดาว/ทีม/เลเวลรวม — ยกดาวและเลเวลที่เคยเล่นมาให้ ไม่ให้รู้สึกว่าของหาย */
function fromLegacy(old: LegacySave): PlayerState {
  const base = createInitialState();
  const level = Math.max(1, Math.floor(old.level ?? 1));
  const roster = { ...base.roster };
  for (const id of old.squad ?? []) {
    if (!roster[id]) continue;
    roster[id] = { ...roster[id]!, level };
  }
  for (const [id, hs] of Object.entries(roster)) roster[id] = { ...hs, level };
  return migrateState({
    ...base,
    roster,
    team: (old.squad ?? base.team).slice(0, 8),
    stars: old.stars ?? {},
    firstCleared: Object.keys(old.stars ?? {}),
  });
}

function persist(state: PlayerState): void {
  cache = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* โหมดส่วนตัว — เล่นต่อได้แต่ไม่บันทึก */
  }
}

export const save = {
  get state(): PlayerState {
    if (!cache) cache = load();
    return cache;
  },
  set(next: PlayerState): void {
    persist(next);
  },
  /** ใช้กับฟังก์ชันของ meta ที่คืน MetaResult — สำเร็จค่อยบันทึก */
  apply(result: MetaResult): MetaResult {
    if (result.ok) persist(result.state);
    return result;
  },
  reset(): void {
    persist(createInitialState());
  },
  totalStars(): number {
    return Object.values(this.state.stars).reduce((a, b) => a + b, 0);
  },
  bestStars(stageId: string): number {
    return this.state.stars[stageId] ?? 0;
  },
};
