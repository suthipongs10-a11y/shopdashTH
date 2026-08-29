# 🏰 HIMMAPAN GUARD (หิมพานต์การ์ด)

เกม Tower Defense ที่ **ฮีโร่คือป้อม** — สูตร Arknights × Summoners War × Ragnarok Online
ในธีมตำนานหิมพานต์ไทย: ป้องกันหมู่บ้านและวัดจากทัพผี ยักษ์ และมาร

> โปรเจ็คนี้อยู่ในโฟลเดอร์แยกของ repo ShopDash และไม่เกี่ยวข้องกับแอปหลักเลย
> เอกสารหลักอยู่ที่ [`CLAUDE.md`](./CLAUDE.md) · สถานะงานอยู่ที่ [`STATUS.md`](./STATUS.md)

## เริ่มเล่น

```bash
cd games/himmapan-guard
npm install
npm run dev        # → http://localhost:5173
```

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เปิดเกมในเบราว์เซอร์ (hot reload) |
| `npm run verify` | ตรวจคอนเทนต์ + typecheck + test + รันจำลองสมดุล (ต้องผ่านก่อน commit) |
| `npm run balance -- --runs 1000` | รันจำลอง 1,000 ด่านด้วย AI แล้วรายงาน win-rate ต่อเลเวล |
| `npm run economy` | โมเดลเศรษฐกิจ 90 วัน → CSV |

## โครงสร้าง

```
packages/data     คอนเทนต์ JSON ทั้งหมด + zod schema (source of truth ของตัวเลขทุกตัว)
packages/sim      เอนจิ้นต่อสู้ pure TypeScript — deterministic, รัน headless ได้, ไม่มี DOM
packages/client   Three.js (ฉาก 3D + sprite billboard) + UI ภาษาไทยแบบ HTML overlay
packages/tools    validate-content · balance-runner · economy-model
```

## สถานะ

| เฟส | สถานะ |
|---|---|
| 0 Foundation | ✅ ผ่าน DoD |
| 1 Combat Sim Core | ✅ ผ่าน DoD (43 tests, 1,000 sims) |
| 2 3D Render + Billboard | ✅ ฟังก์ชันครบ (เหลือวัด fps บนมือถือจริง) |
| 3–10 | ยังไม่เริ่ม — ดู `CLAUDE.md` §6 |
