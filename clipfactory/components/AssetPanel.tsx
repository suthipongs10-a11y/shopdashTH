'use client';

import { useRef } from 'react';
import { Pill } from './ui';

export interface Asset {
  id: string;
  name: string;
  url: string;
  bitmap: ImageBitmap;
}

const MAX_ASSETS = 12;
const MAX_BYTES = 12 * 1024 * 1024;

export function AssetPanel({
  assets,
  onAdd,
  onRemove,
  onMove,
  recommended,
  error,
  onError,
}: {
  assets: Asset[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  recommended: number;
  error: string;
  onError: (m: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (assets.length + files.length > MAX_ASSETS) {
      onError(`ใส่รูปได้สูงสุด ${MAX_ASSETS} รูปต่อคลิป`);
      return;
    }
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) {
        onError('รับเฉพาะไฟล์รูปภาพเท่านั้น');
        return;
      }
      if (f.size > MAX_BYTES) {
        onError(`ไฟล์ ${f.name} ใหญ่เกิน 12 MB`);
        return;
      }
    }
    onAdd(files);
  };

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files);
        }}
        className="rounded-lg border border-dashed border-[var(--color-line)] bg-[var(--color-panel-2)] p-5 text-center"
      >
        <p className="text-sm text-[var(--color-ink-soft)]">ลากรูปสินค้ามาวางที่นี่ หรือ</p>
        <button type="button" className="btn-ghost mt-2" onClick={() => inputRef.current?.click()}>
          เลือกไฟล์รูป
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
          สูตรนี้ใช้ประมาณ {recommended} รูป · ระบบจะสลับรูปตามจังหวะตัดของสูตรให้อัตโนมัติ
          <br />
          ใช้รูปสินค้าจริงเท่านั้น — คลิปที่ดูเป็นภาพ AI ทำยอดได้แย่กว่ามาก
        </p>
      </div>

      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}

      {assets.length ? (
        <>
          <div className="flex items-center justify-between">
            <Pill tone={assets.length >= recommended ? 'accent' : 'default'}>
              {assets.length}/{recommended} รูป
            </Pill>
            {assets.length < recommended ? (
              <span className="text-[11px] text-[var(--color-muted)]">รูปน้อยกว่าที่แนะนำ ระบบจะวนใช้ซ้ำ</span>
            ) : null}
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {assets.map((a, i) => (
              <li key={a.id} className="group relative overflow-hidden rounded-lg border border-[var(--color-line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name} className="aspect-[9/16] w-full object-cover" />
                <span className="mono absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px]">{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1 py-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => onMove(a.id, -1)}
                    disabled={i === 0}
                    className="px-1 text-xs disabled:opacity-30"
                    aria-label={`เลื่อนรูปที่ ${i + 1} ไปทางซ้าย`}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    className="px-1 text-xs text-[var(--color-danger)]"
                    aria-label={`ลบรูปที่ ${i + 1}`}
                  >
                    ลบ
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(a.id, 1)}
                    disabled={i === assets.length - 1}
                    className="px-1 text-xs disabled:opacity-30"
                    aria-label={`เลื่อนรูปที่ ${i + 1} ไปทางขวา`}
                  >
                    ›
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
