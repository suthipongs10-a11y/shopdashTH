// การ์ดสินค้าแบบ 'luxe' (ref T4 — LUXÉ): รูปใหญ่ 3:4 (hover สลับ) → จุดสี → ชื่อ → ราคา
// ของหรูไม่โชว์ดาว/badge/ไซส์/สต๊อก (§5.6) — ความพรีเมียมมาจากรูป + ที่ว่าง

import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardData } from './types';

export function LuxeProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={product.href} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-surface">
        {product.imageUrl ? (
          <>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`object-cover transition duration-500 ease-out group-hover:scale-[1.04] ${
                product.hoverImageUrl ? 'group-hover:opacity-0' : ''
              }`}
            />
            {product.hoverImageUrl && (
              // hidden บนจอสัมผัส — display:none + lazy = ไม่โหลดรูปที่ไม่มีวันเห็น
              <Image
                src={product.hoverImageUrl}
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 768px) 50vw, 25vw"
                className="hidden object-cover opacity-0 transition duration-500 ease-out group-hover:scale-[1.04] group-hover:opacity-100 pointer-fine:block"
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
            <span className="bg-bg px-4 py-1.5 text-xs font-medium tracking-widest text-text">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="mt-3.5 space-y-1.5 text-center">
        {(product.colors ?? []).length > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            {(product.colors ?? []).slice(0, 4).map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
        <p className="truncate text-[15px] text-text" title={product.name}>
          {product.name}
        </p>
        <p className="text-sm font-medium tracking-wide text-text-muted">
          {product.priceMin.toLocaleString('th-TH')}
          {product.priceMax != null && product.priceMax !== product.priceMin
            ? ` – ${product.priceMax.toLocaleString('th-TH')}`
            : ''}{' '}
          บาท
        </p>
      </div>
    </Link>
  );
}
