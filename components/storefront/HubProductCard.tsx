// การ์ดสินค้าแบบ 'hub' (marketplace — ref T3) anatomy ตาม §0.4 + §3.3:
// badge มุมซ้าย (-20% > NEW > BEST) → รูป 3:4 (hover สลับรูปที่สอง) → จุดสี → ชื่อ
// → ราคา (ลด = danger + ขีดฆ่าราคาเดิม) → ดาว+รีวิว → ชิปไซส์ → สถานะสต๊อก
// ทุกค่าเป็นข้อมูลจริง: ลดราคา = price_override < base_price, NEW = created_at ≤ 14 วัน,
// BEST = รีวิวจริง ≥ 15 รายการ, สต๊อกรวมจาก product_variants

import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from './icons';
import type { ProductCardData } from './types';

/** จำนวนรีวิวขั้นต่ำที่ถือว่า "ขายดี" (badge BEST) */
const BEST_REVIEW_COUNT = 15;
/** สต๊อกรวม ≤ ค่านี้ = โชว์ "เหลือ X ชิ้น" สีแดง */
const LOW_STOCK_AT = 5;

function baht(n: number): string {
  return `${n.toLocaleString('th-TH')} บาท`;
}

function CardBadge({ product }: { product: ProductCardData }) {
  // หนึ่งใบหนึ่ง badge — ลดราคาสำคัญสุด (ref: NEW / -20% / BEST / -15%)
  if (product.salePercent) {
    return (
      <span className="absolute left-2 top-2 z-[1] rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold uppercase text-primary-fg">
        -{product.salePercent}%
      </span>
    );
  }
  if (product.isNew) {
    return (
      <span className="absolute left-2 top-2 z-[1] rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-primary-fg">
        NEW
      </span>
    );
  }
  if (product.rating && product.rating.count >= BEST_REVIEW_COUNT) {
    return (
      <span className="absolute left-2 top-2 z-[1] rounded-full bg-badge-best px-2 py-0.5 text-[11px] font-bold uppercase text-primary-fg">
        BEST
      </span>
    );
  }
  return null;
}

export function HubProductCard({ product }: { product: ProductCardData }) {
  const sizes = [...new Set((product.variants ?? []).map((v) => v.size).filter(Boolean))] as string[];
  const totalStock = (product.variants ?? []).reduce((sum, v) => sum + v.stock, 0);

  return (
    <Link
      href={product.href}
      className="group flex flex-col overflow-hidden rounded-md border border-border-soft bg-bg shadow-card transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,.08)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <CardBadge product={product} />
        {product.imageUrl ? (
          <>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 20vw"
              className={`object-cover transition duration-400 ease-out group-hover:scale-[1.04] ${
                product.hoverImageUrl ? 'group-hover:opacity-0' : ''
              }`}
            />
            {product.hoverImageUrl && (
              // hidden บนจอสัมผัส — display:none + lazy = เบราว์เซอร์ไม่โหลดรูป (มือถือไม่มี hover)
              <Image
                src={product.hoverImageUrl}
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 768px) 50vw, 20vw"
                className="hidden object-cover opacity-0 transition duration-400 ease-out group-hover:scale-[1.04] group-hover:opacity-100 pointer-fine:block"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            ไม่มีรูปสินค้า
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-scrim">
            <span className="rounded-full bg-bg px-3.5 py-1 text-xs font-semibold text-text">
              สินค้าหมด
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {(product.colors ?? []).length > 0 && (
          <div className="flex items-center gap-1">
            {(product.colors ?? []).slice(0, 4).map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
            {(product.colors ?? []).length > 4 && (
              <span className="text-[10px] text-text-muted">+{(product.colors ?? []).length - 4}</span>
            )}
          </div>
        )}

        <p className="truncate text-sm font-medium text-text" title={product.name}>
          {product.name}
        </p>

        {product.compareAtPrice ? (
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-base font-bold text-danger">{baht(product.priceMin)}</span>
            <span className="text-xs text-text-muted line-through">
              {product.compareAtPrice.toLocaleString('th-TH')}
            </span>
          </p>
        ) : (
          <p className="text-base font-bold text-text">
            {baht(product.priceMin)}
            {product.priceMax != null && product.priceMax !== product.priceMin ? '+' : ''}
          </p>
        )}

        {product.rating && (
          <p className="flex items-center gap-1 text-xs text-text-muted">
            <StarIcon size={13} className="text-star" />
            <span className="font-medium text-text">{product.rating.score}</span>
            <span>({product.rating.count})</span>
          </p>
        )}

        {sizes.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {sizes.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-[4px] border border-border-soft bg-surface px-1.5 py-px text-[10px] font-medium text-text-muted"
              >
                {s}
              </span>
            ))}
            {sizes.length > 5 && <span className="text-[10px] text-text-muted">+{sizes.length - 5}</span>}
          </div>
        )}

        {/* สถานะสต๊อกอยู่ล่างสุดเสมอ (mt-auto) ให้ทุกใบเรียงเสมอกัน */}
        <p className="mt-auto pt-1 text-xs">
          {totalStock === 0 ? (
            <span className="text-text-muted">สต๊อก: สินค้าหมด</span>
          ) : totalStock <= LOW_STOCK_AT ? (
            <span className="font-medium text-danger">เหลือ {totalStock} ชิ้น</span>
          ) : (
            <span className="text-success">สต๊อก: พร้อมส่ง</span>
          )}
        </p>
      </div>
    </Link>
  );
}
