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
      className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
    >
      ลบสินค้านี้
    </button>
  );
}
