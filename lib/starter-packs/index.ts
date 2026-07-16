// Registry ของ starter pack ทั้งหมด + เช็คความพร้อมของ asset
// pack จะ "เปิดให้เลือก" ที่หน้า signup ก็ต่อเมื่อไฟล์รูปใน requiredAssets ครบใน public/
// (เจ้าของวางรูปตาม public/demo/toys/README.md → redeploy → ตัวเลือกโผล่เอง ไม่ต้องแก้โค้ด)

import 'server-only';
import { existsSync } from 'fs';
import path from 'path';
import { FASHION_PACK } from '@/lib/starter-packs/fashion';
import { AIRCON_PACK, HANDYMAN_PACK, TRANSPORT_PACK } from '@/lib/starter-packs/services';
import { TOYS_PACK } from '@/lib/starter-packs/toys';
import type { StarterPack } from '@/lib/starter-packs/types';

export const DEFAULT_PACK_CODE = FASHION_PACK.code;

const ALL_PACKS: StarterPack[] = [FASHION_PACK, TOYS_PACK, AIRCON_PACK, HANDYMAN_PACK, TRANSPORT_PACK];

// เช็คครั้งเดียวต่อ process — ไฟล์ใน public/ ไม่เปลี่ยนระหว่างรัน (เปลี่ยนได้ตอน deploy เท่านั้น)
const readiness = new Map<string, boolean>();

function packReady(pack: StarterPack): boolean {
  const cached = readiness.get(pack.code);
  if (cached !== undefined) return cached;
  const ready = pack.requiredAssets.every((asset) =>
    existsSync(path.join(process.cwd(), 'public', asset)),
  );
  readiness.set(pack.code, ready);
  return ready;
}

/** pack ที่ asset ครบ พร้อมให้เลือกที่หน้า signup (fashion พร้อมเสมอ — รูปอยู่ใน repo) */
export function listAvailablePacks(): { code: string; nameTh: string }[] {
  return ALL_PACKS.filter(packReady).map((p) => ({ code: p.code, nameTh: p.nameTh }));
}

/** เลือก pack ตาม code — ไม่รู้จัก/asset ไม่ครบ = fallback เป็น fashion (ห้ามได้ร้านเปล่า) */
export function getStarterPack(code: string | undefined | null): StarterPack {
  const pack = ALL_PACKS.find((p) => p.code === code);
  if (pack && packReady(pack)) return pack;
  return FASHION_PACK;
}
