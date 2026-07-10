import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardVariant } from '@/themes/types';
import { formatBahtRange } from '@/lib/format';
import { StoreProductCard } from './StoreProductCard';
import type { ProductCardData } from './types';

function CardImage({ product }: { product: ProductCardData }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-surface">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="opacity-50"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span className="text-xs">ไม่มีรูปสินค้า</span>
        </div>
      )}
      {product.badge && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary-fg shadow-card">
          {product.badge}
        </span>
      )}
      {!product.inStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-scrim backdrop-blur-[2px]">
          <span className="rounded-full bg-bg px-4 py-1.5 text-sm font-semibold text-text">
            สินค้าหมด
          </span>
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  variant = 'minimal',
  slug = '',
  wishlistEnabled = false,
}: {
  product: ProductCardData;
  variant?: ProductCardVariant;
  /** ใช้กับ variant 'store' (ตะกร้า/wishlist ต่อร้าน) */
  slug?: string;
  wishlistEnabled?: boolean;
}) {
  if (variant === 'store') {
    return <StoreProductCard product={product} slug={slug} wishlistEnabled={wishlistEnabled} />;
  }

  const priceText = formatBahtRange(product.priceMin, product.priceMax);

  if (variant === 'overlay') {
    return (
      <Link
        href={product.href}
        className="group relative block overflow-hidden rounded-lg shadow-card transition-shadow duration-300 hover:shadow-lg"
      >
        <CardImage product={product} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim via-scrim/60 to-transparent p-4 pt-14">
          <p className="truncate font-medium text-primary-fg">{product.name}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary-fg/90">{priceText}</p>
        </div>
      </Link>
    );
  }

  if (variant === 'bordered') {
    return (
      <Link
        href={product.href}
        className="group block overflow-hidden rounded-lg border border-border bg-bg shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      >
        <CardImage product={product} />
        <div className="p-3.5">
          <p className="truncate text-sm font-medium text-text">{product.name}</p>
          <p className="mt-1.5 font-heading text-base font-semibold text-primary">{priceText}</p>
        </div>
      </Link>
    );
  }

  // minimal (ดีฟอลต์กลุ่ม Basic) — เรียบแต่มีรายละเอียด: กรอบบางรอบรูป + hover ยกทั้งใบ
  return (
    <Link href={product.href} className="group block">
      <div className="overflow-hidden rounded-lg border border-border-soft transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg">
        <CardImage product={product} />
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-medium text-text">{product.name}</p>
        <p className="mt-0.5 font-heading text-base font-semibold text-primary">{priceText}</p>
      </div>
    </Link>
  );
}
