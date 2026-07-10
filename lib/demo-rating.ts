// ดาวรีวิวเดโม่ — ระบบรีวิวจริงเป็น Future (CLAUDE.md §2.1) แต่ ref เทมเพลต Commerce
// ต้องมีดาว+จำนวนรีวิวบนการ์ด → gen ค่า deterministic จาก product id
// เปิดเฉพาะธีมที่ตั้ง layout.demoRatings (ดู DECISIONS 2026-07-10)

export interface DemoRating {
  score: string; // "4.5"–"5.0"
  count: number; // 18–160
}

export function demoRating(productId: string): DemoRating {
  let h = 0;
  for (let i = 0; i < productId.length; i += 1) {
    h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  }
  const score = (4.5 + (h % 6) / 10).toFixed(1);
  const count = 18 + (h % 143);
  return { score, count };
}
