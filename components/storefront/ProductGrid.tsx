import type { ProductCardVariant } from '@/themes/types';
import { ProductCard } from './ProductCard';
import { SearchIcon } from './icons';
import type { ProductCardData } from './types';

// grid 2 คอลัมน์บนมือถือ (§4.6) — desktop 3–4 คอลัมน์ (variant 'store' = 6 ตาม ref T2)
export function ProductGrid({
  products,
  cardVariant = 'minimal',
  emptyText = 'ยังไม่มีสินค้าในหมวดนี้',
  slug = '',
  wishlistEnabled = false,
  detailButtonText,
}: {
  products: ProductCardData[];
  cardVariant?: ProductCardVariant;
  emptyText?: string;
  /** ใช้กับการ์ดแบบ 'store' (QuickView/wishlist ต่อร้าน) */
  slug?: string;
  wishlistEnabled?: boolean;
  /** ป้ายปุ่มการ์ดแบบ 'simple' (ref T1) */
  detailButtonText?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-text-muted">
          <SearchIcon size={22} />
        </span>
        <p className="text-text-muted">{emptyText}</p>
      </div>
    );
  }
  const gridClass =
    cardVariant === 'store'
      ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
      : cardVariant === 'simple'
        ? 'grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5'
        : 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6';
  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={cardVariant}
          slug={slug}
          wishlistEnabled={wishlistEnabled}
          detailButtonText={detailButtonText}
        />
      ))}
    </div>
  );
}
