'use client';

import { useState } from 'react';
import { Spinner } from './ui';

/**
 * วางข้อความจากแอปช้อปปิ้งแล้วให้ Gemini แยกฟิลด์ให้
 *
 * ตั้งใจไม่ scrape หน้าเว็บ — TikTok Shop และ Shopee เรนเดอร์ด้วย JS และมีระบบกันบอท
 * การกดแชร์แล้ววางข้อความเชื่อถือได้กว่า และใช้ได้กับทุกแพลตฟอร์ม
 */
export function PasteImport({
  busy,
  onImport,
}: {
  busy: boolean;
  onImport: (raw: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost w-full py-2.5 text-xs"
        onClick={() => setOpen(true)}
      >
        ⚡ วางข้อมูลจากแอปแล้วให้ AI กรอกให้ — เร็วกว่าพิมพ์เอง
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.05] p-3.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">วางข้อมูลสินค้า</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            ในแอป TikTok Shop หรือ Shopee กดแชร์สินค้า แล้วเลือกคัดลอกลิงก์
            หรือลากคลุมชื่อสินค้ากับรายละเอียดแล้วคัดลอกมาวางตรงนี้
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-none text-xs text-[var(--color-muted)]"
          aria-label="ปิด"
        >
          ✕
        </button>
      </div>

      <textarea
        className="field min-h-[110px] resize-y font-normal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'ตัวอย่าง\nผงซักผ้าขาว สูตรเข้มข้น ขจัดคราบฝังลึก 1 ถุง 500 กรัม\n฿129  ขายแล้ว 2.3พัน ชิ้น\nแช่ 10 นาที คราบกาแฟ คราบเหงื่อหลุด ไม่ต้องขยี้'}
        disabled={busy}
      />

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          className="btn-primary px-3 py-1.5 text-xs"
          disabled={busy || raw.trim().length < 10}
          onClick={() => onImport(raw.trim())}
        >
          {busy ? 'กำลังแยกข้อมูล…' : 'แยกข้อมูลให้อัตโนมัติ'}
        </button>
        {busy ? <Spinner label="Gemini กำลังอ่าน" /> : null}
        {!busy && raw.trim().length > 0 && raw.trim().length < 10 ? (
          <span className="text-[11px] text-[var(--color-muted)]">วางข้อความให้ยาวกว่านี้อีกนิด</span>
        ) : null}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-muted)]">
        ระบบจะกรอกให้เฉพาะข้อมูลที่พบในข้อความ ไม่แต่งขึ้นเอง — ตรวจทานอีกครั้งก่อนเขียนสคริปต์
      </p>
    </div>
  );
}
