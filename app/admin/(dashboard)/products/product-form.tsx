'use client';

import { useActionState, useEffect, useState } from 'react';
import { createProduct, updateProduct, type ProductActionState } from './actions';

export interface ProductFormProduct {
  id: string;
  name: string;
  description_md: string | null;
  category_id: string | null;
  base_price: number;
  status: 'draft' | 'published' | 'hidden';
  is_featured: boolean;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const initialState: ProductActionState = {};

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: ProductFormProduct;
}) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (product && !state.error && !pending) {
      setSavedFlash(true);
      const timer = setTimeout(() => setSavedFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state, pending, product]);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          ชื่อสินค้า <span className="text-rose-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={product?.name}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description_md" className="mb-1 block text-sm font-medium text-gray-700">
          คำอธิบายสินค้า (รองรับ Markdown เบื้องต้น)
        </label>
        <textarea
          id="description_md"
          name="description_md"
          rows={5}
          defaultValue={product?.description_md ?? ''}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category_id" className="mb-1 block text-sm font-medium text-gray-700">
            หมวดหมู่
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className={inputClass}
          >
            <option value="">ไม่ระบุหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="base_price" className="mb-1 block text-sm font-medium text-gray-700">
            ราคาตั้งต้น (บาท) <span className="text-rose-600">*</span>
          </label>
          <input
            id="base_price"
            name="base_price"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={product?.base_price ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            สถานะ
          </label>
          <select
            id="status"
            name="status"
            defaultValue={product?.status ?? 'draft'}
            className={inputClass}
          >
            <option value="draft">ฉบับร่าง</option>
            <option value="published">เผยแพร่</option>
            <option value="hidden">ซ่อน</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured}
              className="rounded border-gray-300"
            />
            สินค้าแนะนำ (แสดงหน้าแรก)
          </label>
        </div>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {savedFlash && <p className="text-sm text-green-600">บันทึกแล้ว</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : product ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
      </button>
    </form>
  );
}
