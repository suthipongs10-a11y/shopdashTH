'use client';

import { useActionState } from 'react';
import { variantLabel } from '@/lib/variants';
import { updateVariant, type UpdateVariantState } from './actions';

export interface VariantRowData {
  id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  price_override: number | null;
  stock: number;
  low_stock_threshold: number;
  is_enabled: boolean;
}

const cellInputClass =
  'w-full rounded-lg border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const initialState: UpdateVariantState = {};

export function VariantRow({ productId, variant }: { productId: string; variant: VariantRowData }) {
  const action = updateVariant.bind(null, variant.id, productId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <tr className={!variant.is_enabled ? 'bg-gray-50 opacity-60' : undefined}>
      <td className="px-3 py-2 text-sm text-gray-900">{variantLabel(variant.size, variant.color)}</td>
      <td colSpan={5} className="px-3 py-2">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input
            name="sku"
            placeholder="SKU"
            defaultValue={variant.sku ?? ''}
            className={`${cellInputClass} w-28`}
          />
          <input
            name="price_override"
            type="number"
            min={0}
            step={1}
            placeholder="ใช้ราคาตั้งต้น"
            defaultValue={variant.price_override ?? ''}
            className={`${cellInputClass} w-32`}
          />
          <input
            name="stock"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={variant.stock}
            aria-label="สต๊อก"
            className={`${cellInputClass} w-20`}
          />
          <input
            name="low_stock_threshold"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={variant.low_stock_threshold}
            aria-label="แจ้งเตือนเมื่อต่ำกว่า"
            className={`${cellInputClass} w-20`}
          />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked={variant.is_enabled}
              className="rounded border-gray-300"
            />
            เปิดขาย
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            บันทึก
          </button>
          {state.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
        </form>
      </td>
    </tr>
  );
}
