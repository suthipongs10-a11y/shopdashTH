// แถบ "ครบทุกฟังก์ชัน เพื่อการช้อปปิ้งที่ง่ายขึ้น" (ref T2) — พื้นครีม (token secondary)
// 5 คอลัมน์ไอคอนเส้นบาง + หัวข้อ + คำอธิบาย 2 บรรทัด

import { DEFAULT_VARIANT_LABELS, type VariantLabels } from '@/lib/theme-content';
import { BellIcon, CartIcon, ClipboardIcon, QrIcon, ShirtIcon } from './icons';

// copy ข้อ 2 อ้างมิติ variant — ใช้ป้ายของร้าน (ไซส์/สี หรือ ช่วงวัย/แบบ ฯลฯ)
const buildItems = (labels: Required<VariantLabels>) => [
  { icon: CartIcon, title: 'ระบบตะกร้าสินค้า', sub: 'เพิ่มสินค้า เก็บไว้ในตะกร้า แก้ไขจำนวนได้สะดวก' },
  { icon: ShirtIcon, title: `เลือก${labels.size}/${labels.color}/จำนวน`, sub: `เลือก${labels.size} ${labels.color} และจำนวนสินค้าก่อนเพิ่มลงตะกร้า` },
  { icon: QrIcon, title: 'หน้าชำระเงิน', sub: 'กรอกข้อมูล จัดส่ง เลือกวิธีชำระเงิน ง่าย ปลอดภัย' },
  { icon: ClipboardIcon, title: 'จัดการออเดอร์', sub: 'ดูประวัติคำสั่งซื้อและจัดการออเดอร์ได้ในที่เดียว' },
  { icon: BellIcon, title: 'แจ้งสถานะคำสั่งซื้อ', sub: 'อัปเดตสถานะทุกขั้นตอน จนกว่าจะได้รับสินค้า' },
];

export function FeatureBand({
  title,
  variantLabels = DEFAULT_VARIANT_LABELS,
}: {
  title: string;
  variantLabels?: Required<VariantLabels>;
}) {
  const ITEMS = buildItems(variantLabels);
  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-(--container-max) px-4 py-12">
        <h2 className="text-center font-heading text-xl font-semibold tracking-tight text-text md:text-2xl">
          {title}
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
          {ITEMS.map(({ icon: Icon, title: t, sub }) => (
            <div key={t} className="flex flex-col items-center text-center">
              <Icon size={30} className="text-text" />
              <p className="mt-3 text-sm font-semibold text-text">{t}</p>
              <p className="mt-1.5 max-w-44 text-xs leading-relaxed text-text-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
