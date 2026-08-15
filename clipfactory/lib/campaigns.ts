/**
 * ปฏิทินแคมเปญอีคอมเมิร์ซไทย
 *
 * งานวิจัยพบว่าคลิปสูตร "ดีล/คูปอง" ทำ outlier ได้สูงที่สุดในชุดข้อมูล (สูงสุด 5,086 เท่า)
 * แต่ตายทันทีเมื่อจบแคมเปญ — จังหวะจึงสำคัญกว่าคุณภาพคลิป
 *
 * ข้อมูลตรงนี้คำนวณจากปฏิทินล้วน ไม่ต้องเรียก API และไม่มีวันหมดอายุ
 */

export type CampaignKind = 'double-date' | 'payday' | 'festival' | 'seasonal';

export interface Campaign {
  nameTh: string;
  kind: CampaignKind;
  /** วันที่เริ่มขาย */
  date: Date;
  /** ควรเริ่มทำคลิปก่อนกี่วัน */
  leadDays: number;
  noteTh: string;
}

export interface UpcomingCampaign extends Campaign {
  daysUntil: number;
  /** ถึงเวลาลงมือทำคลิปแล้วหรือยัง */
  isActionable: boolean;
  /** กำลังอยู่ในช่วงแคมเปญพอดี */
  isLive: boolean;
}

const FESTIVALS: { month: number; day: number; nameTh: string; leadDays: number; noteTh: string }[] = [
  { month: 1, day: 1, nameTh: 'ปีใหม่', leadDays: 21, noteTh: 'ของขวัญ ของฝาก ของแต่งบ้าน' },
  { month: 4, day: 13, nameTh: 'สงกรานต์', leadDays: 14, noteTh: 'เสื้อลายดอก กันน้ำ กันแดด ของเล่นน้ำ' },
  { month: 5, day: 15, nameTh: 'เปิดเทอม', leadDays: 21, noteTh: 'เครื่องเขียน กระเป๋า ชุดนักเรียน ไอที' },
  { month: 8, day: 12, nameTh: 'วันแม่', leadDays: 14, noteTh: 'ของขวัญแม่ สกินแคร์ อาหารเสริม ของใช้ในบ้าน' },
  { month: 12, day: 5, nameTh: 'วันพ่อ', leadDays: 14, noteTh: 'ของขวัญพ่อ สุขภาพ ไอที' },
  { month: 12, day: 25, nameTh: 'คริสต์มาส', leadDays: 14, noteTh: 'ของขวัญ ของแต่งบ้าน' },
];

/** แคมเปญ double-date ที่แพลตฟอร์มไทยจัดใหญ่เป็นพิเศษ */
const BIG_DOUBLE_DATES = new Set([9, 10, 11, 12]);

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((atMidnight(to).getTime() - atMidnight(from).getTime()) / 86_400_000);
}

/** สร้างรายการแคมเปญตั้งแต่วันนี้ไปข้างหน้า */
function generate(from: Date, horizonDays: number): Campaign[] {
  const out: Campaign[] = [];
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + horizonDays);

  for (let year = from.getFullYear(); year <= end.getFullYear() + 1; year++) {
    for (let month = 1; month <= 12; month++) {
      // double date: 1.1, 2.2, ... 12.12
      const big = BIG_DOUBLE_DATES.has(month);
      out.push({
        nameTh: `${month}.${month}`,
        kind: 'double-date',
        date: new Date(year, month - 1, month),
        leadDays: big ? 10 : 5,
        noteTh: big
          ? 'แคมเปญใหญ่ของทั้ง TikTok Shop และ Shopee — คูปองแรงที่สุดของเดือน'
          : 'แคมเปญกลางเดือน คูปองระดับปกติ',
      });

      // วันเงินออก — คนไทยส่วนใหญ่ได้เงินสิ้นเดือน
      out.push({
        nameTh: `เงินออก ${MONTH_TH[month - 1]}`,
        kind: 'payday',
        date: new Date(year, month - 1, 25),
        leadDays: 3,
        noteTh: 'ช่วงกำลังซื้อสูงสุดของเดือน — สินค้าราคาสูงขึ้นขายได้',
      });

      for (const f of FESTIVALS) {
        if (f.month !== month) continue;
        out.push({
          nameTh: f.nameTh,
          kind: 'festival',
          date: new Date(year, f.month - 1, f.day),
          leadDays: f.leadDays,
          noteTh: f.noteTh,
        });
      }
    }
  }

  return out;
}

/**
 * แคมเปญที่กำลังจะมาถึงภายใน horizonDays วัน
 * @param now ส่งเข้ามาได้เพื่อให้ทดสอบซ้ำได้ (ไม่ใช้ Date.now ตรงๆ ในตรรกะ)
 */
export function upcomingCampaigns(now: Date = new Date(), horizonDays = 45): UpcomingCampaign[] {
  return generate(now, horizonDays)
    .map((c) => {
      const daysUntil = daysBetween(now, c.date);
      return {
        ...c,
        daysUntil,
        // แคมเปญวันเดียวถือว่า live เฉพาะวันนั้น ส่วนเงินออกลากยาวถึงสิ้นเดือน
        isLive: c.kind === 'payday' ? daysUntil <= 0 && daysUntil >= -6 : daysUntil === 0,
        isActionable: daysUntil >= 0 && daysUntil <= c.leadDays,
      };
    })
    .filter((c) => c.daysUntil >= (c.kind === 'payday' ? -6 : 0) && c.daysUntil <= horizonDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function campaignLabel(c: UpcomingCampaign): string {
  if (c.isLive) return 'กำลังจัดอยู่';
  if (c.daysUntil === 0) return 'วันนี้';
  if (c.daysUntil === 1) return 'พรุ่งนี้';
  return `อีก ${c.daysUntil} วัน`;
}
