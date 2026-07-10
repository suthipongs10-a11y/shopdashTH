import Link from 'next/link';
import { MapPinIcon, PhoneIcon, QrIcon, ShieldIcon, TruckIcon } from './icons';

export interface FooterPageLink {
  slug: string;
  title: string;
}

export function Footer({
  storeName,
  address,
  phone,
  pages = [],
}: {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  /** หน้าเพจเผยแพร่ที่ตั้ง show_in_nav (Phase 6 — flag custom_pages) */
  pages?: FooterPageLink[];
}) {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-(--container-max) gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {/* ข้อมูลร้าน */}
        <div className="space-y-3">
          <p className="font-heading text-lg font-bold tracking-tight text-text">{storeName}</p>
          {address && (
            <p className="flex items-start gap-2 text-sm leading-relaxed text-text-muted">
              <MapPinIcon size={16} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{address}</span>
            </p>
          )}
          {phone && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <PhoneIcon size={16} className="shrink-0" />
              <a href={`tel:${phone}`} className="transition-colors hover:text-primary">
                {phone}
              </a>
            </p>
          )}
        </div>

        {/* เมนู */}
        <div>
          <p className="mb-3 text-xs font-semibold tracking-widest text-text-muted">เมนู</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/products" className="text-text transition-colors hover:text-primary">
                สินค้าทั้งหมด
              </Link>
            </li>
            <li>
              <Link href="/track" className="text-text transition-colors hover:text-primary">
                ติดตามคำสั่งซื้อ
              </Link>
            </li>
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/p/${p.slug}`}
                  className="text-text transition-colors hover:text-primary"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* การชำระเงิน & จัดส่ง */}
        <div>
          <p className="mb-3 text-xs font-semibold tracking-widest text-text-muted">
            การชำระเงิน & จัดส่ง
          </p>
          <ul className="space-y-2.5 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <QrIcon size={16} className="shrink-0 text-primary" />
              ชำระเงินด้วย PromptPay สแกนจ่ายได้ทุกธนาคาร
            </li>
            <li className="flex items-center gap-2">
              <ShieldIcon size={16} className="shrink-0 text-primary" />
              ร้านตรวจสอบยอดโอนทุกรายการก่อนจัดส่ง
            </li>
            <li className="flex items-center gap-2">
              <TruckIcon size={16} className="shrink-0 text-primary" />
              จัดส่งทั่วประเทศ พร้อมเลขพัสดุติดตามได้
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border-soft">
        <div className="mx-auto flex max-w-(--container-max) flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-text-muted">
          <p>
            © {new Date().getFullYear()} {storeName}
          </p>
          <p>ขับเคลื่อนโดย ShopDash</p>
        </div>
      </div>
    </footer>
  );
}
