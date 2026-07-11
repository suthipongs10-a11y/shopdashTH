// แถวสินค้าแนะนำเลื่อนแนวนอน (ref T3) — การ์ด hub ใบละ ~200px, scroll-snap
// มือถือปัดนิ้ว / desktop ลาก+ล้อเมาส์ (ไม่ใส่ลูกศร — motion เบาตาม §4)

import { HubProductCard } from './HubProductCard';
import type { ProductCardData } from './types';

export function FeaturedScroller({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {products.map((p) => (
        <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-[220px]">
          <HubProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
