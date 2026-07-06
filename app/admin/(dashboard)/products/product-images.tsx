'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { UploadError, uploadImage } from '@/lib/upload-client';
import { addProductImage, deleteProductImage, reorderProductImages } from './actions';

export interface ProductImageItem {
  id: string;
  publicUrl: string;
}

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageItem[];
}) {
  const [items, setItems] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadImage('product_image', file, productId);
      await addProductImage(productId, uploaded.key);
      setItems((prev) => [...prev, { id: uploaded.key, publicUrl: uploaded.publicUrl }]);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(imageId: string) {
    setItems((prev) => prev.filter((img) => img.id !== imageId));
    startTransition(() => {
      void deleteProductImage(productId, imageId);
    });
  }

  function handleDrop(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;

    setItems((prev) => {
      const next = [...prev];
      const from = next.findIndex((i) => i.id === sourceId);
      const to = next.findIndex((i) => i.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      startTransition(() => {
        void reorderProductImages(
          productId,
          next.map((i) => i.id),
        );
      });
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {items.map((img) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => (dragId.current = img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(img.id)}
            className="group relative h-24 w-24 cursor-move overflow-hidden rounded-md border border-gray-200"
          >
            <Image src={img.publicUrl} alt="รูปสินค้า" fill className="object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              aria-label="ลบรูปนี้"
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-red-600 group-hover:flex"
            >
              ✕
            </button>
          </div>
        ))}

        <label
          className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 text-center text-xs text-gray-500 hover:border-gray-400 ${
            uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? 'กำลังอัปโหลด…' : '+ เพิ่มรูป'}
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {items.length > 1 && <p className="text-xs text-gray-400">ลากรูปเพื่อจัดเรียงลำดับ</p>}
    </div>
  );
}
