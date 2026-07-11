import Link from 'next/link';
import type { ContactChannels, FooterLinkGroup } from '@/lib/theme-content';
import {
  FacebookLogoIcon,
  LineLogoIcon,
  MapPinIcon,
  PhoneIcon,
  QrIcon,
  ShieldIcon,
  TruckIcon,
} from './icons';

export interface FooterPageLink {
  slug: string;
  title: string;
}

/* ---------- Footer แบบ full (ref T2): newsletter + คอลัมน์ลิงก์ + social สีแบรนด์ ---------- */

function SocialIcon({ name }: { name: 'facebook' | 'instagram' | 'line' | 'tiktok' | 'youtube' }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 15,
    height: 15,
    fill: 'currentColor',
    'aria-hidden': true as const,
  };
  switch (name) {
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M13.5 21v-7h2.4l.36-2.8H13.5V9.4c0-.81.22-1.36 1.38-1.36h1.48V5.55c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.6 1.3-3.6 3.7v2.06H8.2V14h2.4v7z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
        </svg>
      );
    case 'line':
      return (
        <svg {...common}>
          <path d="M12 3C6.9 3 2.8 6.4 2.8 10.6c0 3.7 3.3 6.9 7.7 7.5.3.1.7.2.8.5.1.2.1.6 0 .8l-.1.8c0 .2-.2.9.8.5s5.2-3.1 7.1-5.3c1.3-1.4 1.9-2.9 1.9-4.8C21.2 6.4 17.1 3 12 3z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M16.6 3c.3 1.7 1.4 3 3.4 3.3v3c-1.4 0-2.5-.4-3.4-1v6.2c0 3.1-2.1 5.5-5.3 5.5-3 0-5.3-2.3-5.3-5.2 0-3 2.5-5.2 5.6-5V13c-.2-.1-.5-.1-.8-.1-1.3 0-2.3 1-2.3 2.2 0 1.3 1 2.2 2.3 2.2 1.4 0 2.4-1 2.4-2.5V3z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.24 5 12 5 12 5s-6.24 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.76 19 12 19 12 19s6.24 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      );
  }
}

const SOCIALS = [
  { name: 'facebook' as const, className: 'bg-brand-facebook' },
  { name: 'instagram' as const, className: 'bg-brand-instagram' },
  { name: 'line' as const, className: 'bg-brand-line' },
  { name: 'tiktok' as const, className: 'bg-brand-tiktok' },
  { name: 'youtube' as const, className: 'bg-brand-youtube' },
];

/* แถวโลโก้ช่องทางชำระเงิน (ref T3 — "footer มีโลโก้ payment ครบ") ตัวอักษรสีแบรนด์จริง */
function PaymentLogos() {
  return (
    <span className="flex flex-wrap items-center gap-1.5" aria-label="ช่องทางชำระเงินที่รองรับ">
      <span className="rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold italic text-brand-visa">
        VISA
      </span>
      <span className="rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-mastercard">
        Mastercard
      </span>
      <span className="rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-jcb">
        JCB
      </span>
      <span className="flex items-center gap-1 rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-text">
        <QrIcon size={11} />
        PromptPay
      </span>
      <span className="rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-text">
        โอนธนาคาร
      </span>
      <span className="rounded-[3px] border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-text">
        เก็บเงินปลายทาง
      </span>
    </span>
  );
}

function FooterFull({
  storeName,
  linkGroups,
  newsletterText,
  pages,
  showPayments = false,
}: {
  storeName: string;
  linkGroups: FooterLinkGroup[];
  newsletterText: string;
  pages: FooterPageLink[];
  showPayments?: boolean;
}) {
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="mx-auto grid max-w-(--container-max) gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr]">
        {/* newsletter */}
        <div>
          <p className="text-sm font-semibold text-text">สมัครรับข่าวสาร</p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{newsletterText}</p>
          <form className="mt-3 flex gap-2" action="#" aria-label="สมัครรับข่าวสาร">
            <input
              type="email"
              placeholder="กรอกอีเมลของคุณ"
              aria-label="อีเมล"
              className="min-w-0 flex-1 rounded-sm border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
            >
              สมัครเลย
            </button>
          </form>
        </div>

        {linkGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-text">{group.title}</p>
            <ul className="mt-3 space-y-2 text-xs text-text-muted">
              {group.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* social */}
        <div>
          <p className="text-sm font-semibold text-text">ติดตามเรา</p>
          <div className="mt-3 flex gap-1.5">
            {SOCIALS.map((s) => (
              <span
                key={s.name}
                title={s.name}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-primary-fg ${s.className}`}
              >
                <SocialIcon name={s.name} />
              </span>
            ))}
          </div>
          {pages.length > 0 && (
            <ul className="mt-4 space-y-2 text-xs text-text-muted">
              {pages.map((p) => (
                <li key={p.slug}>
                  <Link href={`/p/${p.slug}`} className="transition-colors hover:text-text">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showPayments && (
        <div className="border-t border-border-soft">
          <div className="mx-auto flex max-w-(--container-max) flex-wrap items-center justify-between gap-2 px-4 py-3">
            <p className="text-xs font-medium text-text-muted">ช่องทางชำระเงิน</p>
            <PaymentLogos />
          </div>
        </div>
      )}

      <div className="border-t border-border-soft">
        <div className="mx-auto flex max-w-(--container-max) flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-text-muted">
          <p>
            © {new Date().getFullYear()} {storeName} All Rights Reserved.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/p/privacy" className="hover:text-text">
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link href="/p/terms" className="hover:text-text">
              ข้อตกลงและเงื่อนไข
            </Link>
            <Link href="/track" className="hover:text-text">
              ติดตามคำสั่งซื้อ
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function Footer({
  storeName,
  address,
  phone,
  pages = [],
  variant = 'simple',
  linkGroups = [],
  newsletterText = 'รับสิทธิพิเศษและโปรโมชั่นก่อนใคร',
  contact,
  orderingEnabled = true,
  showPayments = false,
}: {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  /** หน้าเพจเผยแพร่ที่ตั้ง show_in_nav (Phase 6 — flag custom_pages) */
  pages?: FooterPageLink[];
  /** 'full' = footer แบบ Commerce (newsletter + คอลัมน์ลิงก์ + social — ref T2) */
  variant?: 'simple' | 'full';
  linkGroups?: FooterLinkGroup[];
  newsletterText?: string;
  /** ช่องทางแชทของร้าน (ref T1) — โชว์ในคอลัมน์ติดต่อของ footer แบบ simple */
  contact?: ContactChannels;
  /** ปิด = ร้านขายผ่านแชท ไม่โชว์ข้อความชำระเงิน PromptPay */
  orderingEnabled?: boolean;
  /** แถวโลโก้ payment ใน footer full (ref T3 — layout.footerPayments) */
  showPayments?: boolean;
}) {
  if (variant === 'full') {
    return (
      <FooterFull
        storeName={storeName}
        linkGroups={linkGroups}
        newsletterText={newsletterText}
        pages={pages}
        showPayments={showPayments}
      />
    );
  }
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
          {contact?.lineUrl && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-line text-primary-fg">
                <LineLogoIcon size={12} />
              </span>
              <a
                href={contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                {contact.lineLabel ?? 'LINE'}
              </a>
            </p>
          )}
          {contact?.facebookUrl && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-facebook text-primary-fg">
                <FacebookLogoIcon size={12} />
              </span>
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                {contact.facebookLabel ?? 'Facebook'}
              </a>
            </p>
          )}
        </div>

        {/* เมนู */}
        <div>
          <p className="mb-3 text-xs font-semibold tracking-widest text-text-muted">เมนู</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="text-text transition-colors hover:text-primary">
                หน้าแรก
              </Link>
            </li>
            <li>
              <Link href="/products" className="text-text transition-colors hover:text-primary">
                สินค้าทั้งหมด
              </Link>
            </li>
            {orderingEnabled && (
              <li>
                <Link href="/track" className="text-text transition-colors hover:text-primary">
                  ติดตามคำสั่งซื้อ
                </Link>
              </li>
            )}
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
            {orderingEnabled ? (
              <>
                <li className="flex items-center gap-2">
                  <QrIcon size={16} className="shrink-0 text-primary" />
                  ชำระเงินด้วย PromptPay สแกนจ่ายได้ทุกธนาคาร
                </li>
                <li className="flex items-center gap-2">
                  <ShieldIcon size={16} className="shrink-0 text-primary" />
                  ร้านตรวจสอบยอดโอนทุกรายการก่อนจัดส่ง
                </li>
              </>
            ) : (
              <li className="flex items-center gap-2">
                <ShieldIcon size={16} className="shrink-0 text-primary" />
                สั่งซื้อและชำระเงินผ่านแชทของร้านโดยตรง
              </li>
            )}
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
