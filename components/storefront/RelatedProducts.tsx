import type { ProductCardVariant } from '@/themes/types';
import { ProductGrid } from './ProductGrid';
import type { ProductCardData } from './types';

// สินค้าที่เกี่ยวข้องท้ายหน้าสินค้า — render เฉพาะเมื่อ feature เปิด (ธีม Pro ขึ้นไป §2.1)
export function RelatedProducts({
  products,
  enabled,
  cardVariant = 'minimal',
  slug = '',
  wishlistEnabled = false,
}: {
  products: ProductCardData[];
  enabled: boolean;
  cardVariant?: ProductCardVariant;
  slug?: string;
  wishlistEnabled?: boolean;
}) {
  if (!enabled || products.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-10">
      <h2 className="mb-4 font-heading text-xl font-semibold">สินค้าที่คุณอาจชอบ</h2>
      <ProductGrid
        products={products.slice(0, 4)}
        cardVariant={cardVariant}
        slug={slug}
        wishlistEnabled={wishlistEnabled}
      />
    </section>
  );
}
