// แถบ "ระบบและบริการ" 8 ไอคอน (ref T3) — พื้น secondary, ไอคอนเส้นบาง + หัวข้อ + คำอธิบายสั้น
// รายการสะท้อนความสามารถจริงของแพลนธุรกิจ (ตะกร้า/PromptPay/ติดตาม/รีวิว/ส่วนลด ฯลฯ)

import { DEFAULT_VARIANT_LABELS, type VariantLabels } from '@/lib/theme-content';
import {
  BellIcon,
  CartIcon,
  ClipboardIcon,
  HeadsetIcon,
  QrIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
} from './icons';

// copy ข้อแรกอ้างมิติ variant — ใช้ป้ายของร้าน (ไซส์/สี หรือ ช่วงวัย/แบบ ฯลฯ)
const buildItems = (labels: Required<VariantLabels>) => [
  { icon: CartIcon, title: 'ตะกร้า & สั่งซื้อออนไลน์', sub: `เลือก${labels.size}/${labels.color} เพิ่มลงตะกร้า จ่ายจบในเว็บ` },
  { icon: QrIcon, title: 'ชำระผ่าน PromptPay', sub: 'QR ยอดตรงต่อออร์เดอร์ สแกนได้ทุกธนาคาร' },
  { icon: ClipboardIcon, title: 'เช็คสถานะออร์เดอร์', sub: 'เลขคำสั่งซื้อ + เบอร์โทร เช็คได้ตลอด' },
  { icon: TruckIcon, title: 'เลขพัสดุติดตามได้', sub: 'อัปเดตเลขแทรคทุกออร์เดอร์ที่จัดส่ง' },
  { icon: TagIcon, title: 'โค้ดส่วนลด', sub: 'คูปองลดราคา percent/บาท พร้อมเงื่อนไข' },
  { icon: StarIcon, title: 'รีวิวจากลูกค้าจริง', sub: 'คะแนนดาวและรีวิวแสดงบนหน้าสินค้า' },
  { icon: BellIcon, title: 'แจ้งเตือนสถานะ', sub: 'รู้ทุกความเคลื่อนไหวของคำสั่งซื้อ' },
  { icon: HeadsetIcon, title: 'ทีมงานดูแล', sub: 'ทักแชทสอบถามได้ทุกวัน 09.00-18.00' },
];

export function ServiceBand({
  title,
  variantLabels = DEFAULT_VARIANT_LABELS,
}: {
  title: string;
  variantLabels?: Required<VariantLabels>;
}) {
  const ITEMS = buildItems(variantLabels);
  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-(--container-max) px-4 py-10">
        <h2 className="text-center font-heading text-xl font-semibold tracking-tight text-text md:text-2xl">
          {title}
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-8">
          {ITEMS.map(({ icon: Icon, title: t, sub }) => (
            <div key={t} className="flex flex-col items-center text-center">
              <Icon size={26} className="text-text" />
              <p className="mt-2.5 text-[13px] font-semibold leading-snug text-text">{t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
