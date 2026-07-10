'use client';

// ฟอร์ม guest checkout ฟอร์มเดียว (§2.1) — ไม่มี register/login ฝั่งลูกค้า
// เบอร์โทรคือ key ติดตามออร์เดอร์ — บังคับรูปแบบ 0XXXXXXXXX

import { useState } from 'react';
import type { CheckoutFormData } from './types';

const PHONE_PATTERN = /^0[0-9]{9}$/;

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-muted hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-ring';

export function CheckoutForm({
  onSubmit,
  submitting,
  serverError,
}: {
  onSubmit: (data: CheckoutFormData) => void | Promise<void>;
  submitting: boolean;
  /** ข้อความ error จาก /api/checkout เช่น สต๊อกไม่พอ / ราคาเปลี่ยน */
  serverError?: string | null;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: CheckoutFormData = {
      shipName: String(form.get('shipName') ?? '').trim(),
      shipPhone: String(form.get('shipPhone') ?? '').trim(),
      shipAddress: String(form.get('shipAddress') ?? '').trim(),
      note: String(form.get('note') ?? '').trim() || undefined,
    };

    const nextErrors: typeof errors = {};
    if (!data.shipName) nextErrors.shipName = 'กรุณากรอกชื่อผู้รับ';
    if (!PHONE_PATTERN.test(data.shipPhone)) {
      nextErrors.shipPhone = 'กรุณากรอกเบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 0';
    }
    if (data.shipAddress.length < 10) {
      nextErrors.shipAddress = 'กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="shipName" className="mb-1 block text-sm font-medium">
          ชื่อผู้รับ <span className="text-danger">*</span>
        </label>
        <input id="shipName" name="shipName" type="text" required className={inputClass} />
        {errors.shipName && <p className="mt-1 text-xs text-danger">{errors.shipName}</p>}
      </div>

      <div>
        <label htmlFor="shipPhone" className="mb-1 block text-sm font-medium">
          เบอร์โทรศัพท์มือถือ <span className="text-danger">*</span>
        </label>
        <input
          id="shipPhone"
          name="shipPhone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="08XXXXXXXX"
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-text-muted">
          ใช้เบอร์นี้คู่กับเลขออร์เดอร์เพื่อติดตามสถานะการสั่งซื้อ
        </p>
        {errors.shipPhone && <p className="mt-1 text-xs text-danger">{errors.shipPhone}</p>}
      </div>

      <div>
        <label htmlFor="shipAddress" className="mb-1 block text-sm font-medium">
          ที่อยู่จัดส่ง <span className="text-danger">*</span>
        </label>
        <textarea
          id="shipAddress"
          name="shipAddress"
          rows={3}
          required
          placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
          className={inputClass}
        />
        {errors.shipAddress && <p className="mt-1 text-xs text-danger">{errors.shipAddress}</p>}
      </div>

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          หมายเหตุถึงร้าน (ถ้ามี)
        </label>
        <textarea id="note" name="note" rows={2} className={inputClass} />
      </div>

      {serverError && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
      >
        {submitting ? 'กำลังสร้างคำสั่งซื้อ…' : 'ยืนยันคำสั่งซื้อ →'}
      </button>
    </form>
  );
}
