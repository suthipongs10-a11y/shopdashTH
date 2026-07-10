'use client';

import { useActionState } from 'react';
import { regenerateVariants, type RegenerateVariantsState } from './actions';
import { VariantRow, type VariantRowData } from './variant-row';

const initialState: RegenerateVariantsState = {};

export function VariantMatrix({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRowData[];
}) {
  const action = regenerateVariants.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sizes" className="mb-1 block text-sm font-medium text-gray-700">
            ไซส์ (คั่นด้วย , )
          </label>
          <input
            id="sizes"
            name="sizes"
            placeholder="S, M, L, XL"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="colors" className="mb-1 block text-sm font-medium text-gray-700">
            สี (คั่นด้วย , )
          </label>
          <input
            id="colors"
            name="colors"
            placeholder="แดง, น้ำเงิน"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังสร้าง…' : 'สร้าง / เพิ่ม Variant'}
        </button>
      </form>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.addedCount !== undefined && (
        <p className="text-sm text-green-600">
          {state.addedCount > 0
            ? `เพิ่ม variant ใหม่ ${state.addedCount} รายการ`
            : 'ไม่มี combination ใหม่ที่ต้องเพิ่ม'}
        </p>
      )}
      <p className="text-xs text-gray-400">
        เว้นว่างช่องไซส์หรือสีถ้าสินค้าไม่มีมิตินั้น — กด "สร้าง/เพิ่ม Variant" ซ้ำได้ ระบบจะเพิ่มเฉพาะ combination ที่ยังไม่มี
      </p>

      {variants.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-6 text-center text-sm text-gray-500">
          ยังไม่มี variant — กรอกไซส์/สีด้านบนแล้วกด "สร้าง/เพิ่ม Variant"
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">ตัวเลือก</th>
                <th className="px-3 py-2 font-medium">SKU / ราคา / สต๊อก / สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants.map((variant) => (
                <VariantRow key={variant.id} productId={productId} variant={variant} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
