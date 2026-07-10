// รีวิวจากลูกค้าบนหน้าสินค้า — ข้อมูลจริงจาก product_reviews (แอดมินร้านจัดการ)
// สรุปคะแนนซ้าย + รายการรีวิวขวา — ซ่อนทั้ง section เมื่อไม่มีรีวิว

import type { ProductReview, RatingSummary } from '@/lib/reviews';
import { formatThaiDate } from '@/lib/format';
import { StarIcon } from './icons';

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} className={i <= rating ? 'text-star' : 'text-border'} />
      ))}
    </span>
  );
}

export function ReviewList({
  summary,
  reviews,
}: {
  summary: RatingSummary;
  reviews: ProductReview[];
}) {
  return (
    <section className="mt-12 border-t border-border-soft pt-10">
      <h2 className="font-heading text-lg font-semibold tracking-tight text-text">
        รีวิวจากลูกค้า
      </h2>

      <div className="mt-5 grid gap-8 md:grid-cols-[220px_1fr]">
        {/* สรุปคะแนน */}
        <div className="flex h-fit flex-col items-center gap-1.5 rounded-md border border-border-soft bg-surface p-6 text-center">
          <p className="text-4xl font-bold text-text">{summary.score}</p>
          <Stars rating={Math.round(Number(summary.score))} size={16} />
          <p className="text-xs text-text-muted">จาก {summary.count} รีวิว</p>
        </div>

        {/* รายการรีวิว */}
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-border-soft pb-5 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars rating={r.rating} />
                <p className="text-sm font-medium text-text">{r.authorName}</p>
                <p className="text-xs text-text-muted">{formatThaiDate(r.createdAt)}</p>
              </div>
              {r.comment && (
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
