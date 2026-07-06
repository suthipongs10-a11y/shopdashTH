import type { ProductCardVariant } from '@/themes/types';
import { ProductCard } from './ProductCard';
import type { ProductCardData } from './types';

// grid 2 คอลัมน์บนมือถือ (§4.6) — desktop 3–4 คอลัมน์
export function ProductGrid({
  products,
  cardVariant = 'minimal',
  emptyText = 'ยังไม่มีสินค้าในหมวดนี้',
}: {
  products: ProductCardData[];
  cardVariant?: ProductCardVariant;
  emptyText?: string;
}) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-text-muted">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={cardVariant} />
      ))}
    </div>
  );
}
