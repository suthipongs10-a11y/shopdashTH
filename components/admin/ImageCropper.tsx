'use client';

// เครื่องมือครอปรูปในเบราว์เซอร์ (zero-dep) — ล็อกสัดส่วนตามช่องที่ธีมเรนเดอร์
// ผู้ใช้ลาก/ซูมเลือกส่วนที่ต้องการ → วาดลง canvas เป็น webp พร้อมอัปโหลด
// โมเดล: crop rect อยู่ในพิกัดจริงของรูป (natural px) — zoom=1 คือกรอบใหญ่สุดที่พอดีสัดส่วน

import { useEffect, useRef, useState } from 'react';

const MAX_FRAME = 360; // px ด้านยาวสุดของกรอบพรีวิว
const MAX_OUTPUT = 1600; // px ด้านยาวสุดของไฟล์ผลลัพธ์ (§3.9)
const WEBP_QUALITY = 0.85;
const MAX_ZOOM = 3;

interface Props {
  file: File;
  /** สัดส่วนกรอบ กว้าง/สูง */
  aspect: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export function ImageCropper({ file, aspect, onCancel, onCropped }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // มุมบนซ้ายของ crop rect (natural px)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // โหลดรูปจากไฟล์เป็น object URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () =>
      setError('โหลดรูปไม่สำเร็จ — ไฟล์อาจไม่รองรับ (เช่น HEIC จากไอโฟน ให้แปลงเป็น jpg ก่อน)');
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // crop rect ใหญ่สุดที่พอดีสัดส่วน (zoom=1)
  function baseCrop(image: HTMLImageElement) {
    const { naturalWidth: nW, naturalHeight: nH } = image;
    return nW / nH > aspect ? { cw: nH * aspect, ch: nH } : { cw: nW, ch: nW / aspect };
  }

  // crop rect ปัจจุบัน (ยิ่ง zoom มาก = เลือกพื้นที่เล็กลง)
  function cropSize(image: HTMLImageElement) {
    const { cw, ch } = baseCrop(image);
    return { cw: cw / zoom, ch: ch / zoom };
  }

  function clampOffset(image: HTMLImageElement, x: number, y: number) {
    const { cw, ch } = cropSize(image);
    return {
      x: Math.min(Math.max(0, x), image.naturalWidth - cw),
      y: Math.min(Math.max(0, y), image.naturalHeight - ch),
    };
  }

  // ตั้ง crop เริ่มต้น = กึ่งกลางภาพ เมื่อโหลดรูปเสร็จ
  useEffect(() => {
    if (!img) return;
    setZoom(1);
    const { cw, ch } = baseCrop(img);
    setOffset({ x: (img.naturalWidth - cw) / 2, y: (img.naturalHeight - ch) / 2 });
  }, [img]); // eslint-disable-line react-hooks/exhaustive-deps

  // zoom เปลี่ยน → กัน crop หลุดขอบ
  useEffect(() => {
    if (!img) return;
    setOffset((prev) => clampOffset(img, prev.x, prev.y));
  }, [zoom, img]); // eslint-disable-line react-hooks/exhaustive-deps

  // ขนาดกรอบพรีวิว (คงสัดส่วน ภายในกล่อง MAX_FRAME × MAX_FRAME)
  const frame =
    aspect >= 1
      ? { w: MAX_FRAME, h: MAX_FRAME / aspect }
      : { w: MAX_FRAME * aspect, h: MAX_FRAME };

  // สเกลจากพิกัดจริง → พิกเซลบนกรอบพรีวิว
  const scale = img ? frame.w / cropSize(img).cw : 1;

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !img) return;
    const natPerPx = cropSize(img).cw / frame.w;
    const dx = (e.clientX - dragRef.current.px) * natPerPx;
    const dy = (e.clientY - dragRef.current.py) * natPerPx;
    // ลากรูปไปทางขวา = เห็นด้านซ้ายมากขึ้น = offset ลด
    setOffset(clampOffset(img, dragRef.current.ox - dx, dragRef.current.oy - dy));
  }

  function endDrag() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    try {
      const { cw, ch } = cropSize(img);
      // จำกัดด้านยาวสุดไว้ที่ MAX_OUTPUT โดยไม่ขยายเกินความละเอียดจริงของ crop
      let outW: number;
      let outH: number;
      if (aspect >= 1) {
        outW = Math.min(MAX_OUTPUT, cw);
        outH = outW / aspect;
      } else {
        outH = Math.min(MAX_OUTPUT, ch);
        outW = outH * aspect;
      }
      outW = Math.round(outW);
      outH = Math.round(outH);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const c = canvas.getContext('2d');
      if (!c) throw new Error('no-context');
      c.drawImage(img, offset.x, offset.y, cw, ch, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/webp', WEBP_QUALITY),
      );
      if (!blob) throw new Error('no-blob');
      onCropped(blob);
    } catch {
      setError('ครอปรูปไม่สำเร็จ กรุณาลองใหม่');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-gray-900">ครอปรูปให้พอดีกรอบ</h3>
        <p className="mt-0.5 text-xs font-medium text-gray-500">
          ลากเพื่อเลื่อน · ใช้แถบเลื่อนเพื่อซูม — ส่วนในกรอบคือส่วนที่จะแสดงบนหน้าร้าน
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border-2 border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <div className="mt-4 flex justify-center">
              <div
                className="relative touch-none overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100"
                style={{ width: frame.w, height: frame.h }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img && (
                  <img
                    src={img.src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                    style={{
                      width: img.naturalWidth * scale,
                      height: img.naturalHeight * scale,
                      transform: `translate(${-offset.x * scale}px, ${-offset.y * scale}px)`,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">ซูม</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
                aria-label="ซูม"
              />
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          {!error && (
            <button
              type="button"
              onClick={confirm}
              disabled={busy || !img}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? 'กำลังอัปโหลด…' : 'ครอปและใช้รูปนี้'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
