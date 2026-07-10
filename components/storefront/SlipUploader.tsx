'use client';

// อัปโหลดสลิปโอนเงิน — jpg/png/webp ≤ 5MB (§2.2)
// ปุ่ม disable ระหว่างส่ง กันกดรัว/เน็ตหลุดอัปซ้ำ (§7.3)

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface SlipUploadResult {
  ok: boolean;
  /** ข้อความแจ้งผล เช่น "สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบหรือติดต่อร้าน" */
  message?: string;
}

export function SlipUploader({
  onUpload,
  disabled = false,
  disabledReason,
}: {
  onUpload: (file: File) => Promise<SlipUploadResult>;
  /** เช่น ออร์เดอร์มีสลิปรอตรวจอยู่แล้ว (§7.3) */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setMessage(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      setMessage({ ok: false, text: 'รองรับเฉพาะไฟล์ jpg, png หรือ webp' });
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFile(null);
      setMessage({ ok: false, text: 'ขนาดไฟล์ต้องไม่เกิน 5MB' });
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setMessage(null);
    try {
      const result = await onUpload(file);
      if (result.ok) {
        setDone(true);
        setFile(null);
        setMessage({
          ok: true,
          text: result.message ?? 'อัปโหลดสลิปเรียบร้อย รอร้านตรวจสอบและยืนยันคำสั่งซื้อ',
        });
      } else {
        setMessage({ ok: false, text: result.message ?? 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
      }
    } catch {
      setMessage({ ok: false, text: 'เกิดข้อผิดพลาดระหว่างอัปโหลด กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setUploading(false);
    }
  }

  const inputDisabled = disabled || uploading || done;

  return (
    <div className="space-y-3">
      {disabled && disabledReason && (
        <p className="rounded-md bg-surface px-3 py-2 text-sm text-text-muted">{disabledReason}</p>
      )}

      <label
        className={`block cursor-pointer rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm ${
          inputDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleSelect}
          disabled={inputDisabled}
          className="sr-only"
        />
        {file ? (
          <span className="font-medium text-text">{file.name}</span>
        ) : (
          <span className="text-text-muted">แตะเพื่อเลือกรูปสลิปโอนเงิน (jpg / png / webp ไม่เกิน 5MB)</span>
        )}
      </label>

      {previewUrl && (
        <div className="relative mx-auto h-64 w-48 overflow-hidden rounded-md border border-border">
          <Image src={previewUrl} alt="ตัวอย่างสลิป" fill unoptimized className="object-contain" />
        </div>
      )}

      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            message.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}
        >
          {message.text}
        </p>
      )}

      {!done && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || inputDisabled}
          className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {uploading ? 'กำลังอัปโหลด…' : 'ส่งสลิปให้ร้านตรวจสอบ'}
        </button>
      )}
    </div>
  );
}
