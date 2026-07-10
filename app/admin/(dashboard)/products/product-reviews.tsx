'use client';

// section รีวิวสินค้าในหน้าแก้ไขสินค้า — เพิ่ม/ซ่อน/ลบ (ดาวบนหน้าร้านมาจากข้อมูลนี้)

import { useActionState } from 'react';
import {
  addReview,
  deleteReview,
  toggleReviewPublished,
  type ReviewActionState,
} from './review-actions';

export interface ReviewRowData {
  id: string;
  rating: number;
  author_name: string;
  comment: string | null;
  is_published: boolean;
  created_at: string;
}

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const initialState: ReviewActionState = {};

export function ProductReviews({
  productId,
  reviews,
}: {
  productId: string;
  reviews: ReviewRowData[];
}) {
  const action = addReview.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const published = reviews.filter((r) => r.is_published);
  const avg =
    published.length > 0
      ? (published.reduce((s, r) => s + r.rating, 0) / published.length).toFixed(1)
      : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {avg
          ? `คะแนนเฉลี่ยที่ลูกค้าเห็นบนหน้าร้าน: ★ ${avg} จาก ${published.length} รีวิว`
          : 'ยังไม่มีรีวิว — สินค้าที่ไม่มีรีวิวจะไม่แสดงดาวบนหน้าร้าน'}
      </p>

      {/* ฟอร์มเพิ่มรีวิว */}
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
      >
        <label className="text-sm text-gray-700">
          <span className="mb-1 block text-xs text-gray-500">คะแนน</span>
          <select name="rating" defaultValue="5" className={inputClass}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          <span className="mb-1 block text-xs text-gray-500">ชื่อลูกค้า</span>
          <input name="author_name" required placeholder="เช่น คุณเมย์" className={`${inputClass} w-40`} />
        </label>
        <label className="min-w-0 flex-1 text-sm text-gray-700">
          <span className="mb-1 block text-xs text-gray-500">ข้อความรีวิว (ไม่บังคับ)</span>
          <input name="comment" placeholder="เช่น ผ้าดี ใส่สบาย ส่งไวมาก" className={`${inputClass} w-full`} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          เพิ่มรีวิว
        </button>
        {state.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
      </form>

      {/* รายการรีวิว */}
      {reviews.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 ${
                r.is_published ? '' : 'bg-gray-50 opacity-60'
              }`}
            >
              <span className="text-sm text-amber-500">{'★'.repeat(r.rating)}</span>
              <span className="text-sm font-medium text-gray-900">{r.author_name}</span>
              {r.comment && <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{r.comment}</span>}
              {!r.is_published && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">ซ่อนอยู่</span>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleReviewPublished(r.id, productId, !r.is_published)}
                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
                >
                  {r.is_published ? 'ซ่อน' : 'แสดง'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`ลบรีวิวของ "${r.author_name}"?`)) deleteReview(r.id, productId);
                  }}
                  className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                >
                  ลบ
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
