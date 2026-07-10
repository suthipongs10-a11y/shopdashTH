'use client';

import { deleteProduct } from './actions';

export function DeleteProductButton({ productId, name }: { productId: string; name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(`ลบสินค้า "${name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) {
          void deleteProduct(productId);
        }
      }}
      className="rounded-md border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
    >
      ลบสินค้านี้
    </button>
  );
}
