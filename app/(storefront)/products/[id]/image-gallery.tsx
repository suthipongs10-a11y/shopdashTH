'use client';

// แกลเลอรีรูปสินค้า — รูปใหญ่ + thumbnail แนวตั้ง (wireframe กลุ่ม Basic §4.6)

import Image from 'next/image';
import { useState } from 'react';

export function ImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-surface text-text-muted">
        ไม่มีรูปสินค้า
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 sm:flex-col">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`รูปที่ ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                i === activeIndex
                  ? 'border-primary shadow-card'
                  : 'border-border-soft opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-lg border border-border-soft bg-surface shadow-card">
        <Image
          src={images[activeIndex]}
          alt={productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
