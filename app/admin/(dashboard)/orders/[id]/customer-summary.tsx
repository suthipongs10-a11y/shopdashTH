'use client';

// ส่งสรุปคำสั่งซื้อให้ลูกค้า (Billing v2 order summary)
// - คัดลอกลิงก์หน้าสรุป (แนบ public_token → ลูกค้าเห็นข้อมูลจัดส่งเต็ม)
// - คัดลอกข้อความสรุปสำเร็จรูป ไว้วางส่งในแชท (LINE/Facebook) ได้ทันที

import { useState } from 'react';

export function CustomerSummaryPanel({
  payPath,
  summaryText,
}: {
  /** path หน้าสรุปพร้อม token เช่น /orders/DEMO-260710-0001/pay?t=... */
  payPath: string;
  /** ข้อความสรุปออร์เดอร์ (ยังไม่มีลิงก์ — ต่อท้ายตอนคัดลอกเพราะต้องรู้ origin จริง) */
  summaryText: string;
}) {
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(kind: 'link' | 'text') {
    const url = `${window.location.origin}${payPath}`;
    const value = kind === 'link' ? url : `${summaryText}\n\nดูสรุปและชำระเงิน:\n${url}`;
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด');
    }
  }

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 text-sm">
      <h2 className="mb-1 font-medium text-gray-500">ส่งสรุปให้ลูกค้า</h2>
      <p className="mb-3 text-xs text-gray-400">
        ลิงก์นี้มีรหัสส่วนตัวของออร์เดอร์ — ลูกค้าเปิดแล้วเห็นรายการสินค้า ยอดชำระ QR
        สแกนจ่าย และที่อยู่จัดส่งครบถ้วน
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy('link')}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
        >
          {copied === 'link' ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์สรุป'}
        </button>
        <button
          type="button"
          onClick={() => copy('text')}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
        >
          {copied === 'text' ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อความสรุป (วางในแชท)'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
