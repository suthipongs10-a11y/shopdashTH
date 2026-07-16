'use client';

// แผงฟอร์ม "จองการเดินทาง" ใน hero ของเทมเพลตบริการรถ (S1/S2/S3 — ref เจ้าของ)
// ไม่มี backend การจอง (ระดับ 2 เป็นงานอนาคต): กดปุ่มแล้วประกอบข้อความสรุปการเดินทาง
// เปิด LINE ของร้าน (ถ้าตั้ง) หรือโทรหาร้าน — ตรงคอนเซ็ปต์ "แนะนำบริการ + ติดต่อผ่านแชท"
// สี/ฟอนต์มาจาก token ทั้งหมด — ทุกเทมเพลตใช้ตัวเดียวกัน

import { useState } from 'react';
import { PhoneIcon } from '@/components/storefront/icons';
import type { InquiryContent } from '@/lib/theme-content';

const inputClass =
  'w-full rounded-(--radius-sm) border border-soft bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-ring';

const labelClass = 'mb-1 block text-xs font-semibold text-text-muted';

export function InquiryPanel({
  inquiry,
  lineUrl,
  phone,
}: {
  inquiry?: InquiryContent;
  lineUrl?: string;
  phone?: string | null;
}) {
  const options = inquiry?.serviceOptions?.length
    ? inquiry.serviceOptions
    : ['รับ-ส่งสนามบิน', 'เดินทางในเมือง', 'เหมารายวัน', 'เดินทางต่างจังหวัด'];
  const [service, setService] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pax, setPax] = useState('');
  const [note, setNote] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const lines = [
      'สวัสดีครับ/ค่ะ ต้องการสอบถามการเดินทาง',
      service && `ประเภทบริการ: ${service}`,
      pickup && `รับที่: ${pickup}`,
      dropoff && `ส่งที่: ${dropoff}`,
      date && `วันที่: ${date}`,
      time && `เวลา: ${time}`,
      pax && `ผู้โดยสาร: ${pax} ท่าน`,
      note && `หมายเหตุ: ${note}`,
    ].filter(Boolean);
    const message = lines.join('\n');
    if (lineUrl) {
      // LINE ไม่รองรับ prefill ข้อความผ่าน URL ของ OA ทุกแบบ — copy ให้ลูกค้าวางเอง
      navigator.clipboard?.writeText(message).catch(() => undefined);
      window.open(lineUrl, '_blank', 'noopener');
    } else if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  const canContact = !!lineUrl || !!phone;

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-(--radius-lg) border border-soft bg-surface p-5 shadow-card"
    >
      <p className="text-center font-heading text-lg font-bold text-text">
        {inquiry?.title ?? 'จองการเดินทาง'}
      </p>
      {inquiry?.sub && (
        <p className="mt-1 text-center text-xs text-text-muted">{inquiry.sub}</p>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="inq-service" className={labelClass}>
            ประเภทบริการ
          </label>
          <select
            id="inq-service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className={inputClass}
          >
            <option value="">เลือกประเภทบริการ</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inq-pickup" className={labelClass}>
            รับที่
          </label>
          <input
            id="inq-pickup"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="ระบุสถานที่รับ"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="inq-dropoff" className={labelClass}>
            ส่งที่
          </label>
          <input
            id="inq-dropoff"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="ระบุสถานที่ส่ง"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inq-date" className={labelClass}>
              วันที่
            </label>
            <input
              id="inq-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="inq-time" className={labelClass}>
              เวลา
            </label>
            <input
              id="inq-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="inq-pax" className={labelClass}>
            ผู้โดยสาร
          </label>
          <select id="inq-pax" value={pax} onChange={(e) => setPax(e.target.value)} className={inputClass}>
            <option value="">เลือกจำนวนผู้โดยสาร</option>
            {['1', '2', '3', '4', '5-9', '10+'].map((n) => (
              <option key={n} value={n}>
                {n} ท่าน
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inq-note" className={labelClass}>
            หมายเหตุ (ถ้ามี)
          </label>
          <input
            id="inq-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ระบุความต้องการพิเศษ"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canContact}
        className="mt-4 w-full rounded-(--radius-sm) bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {inquiry?.buttonText ?? 'ตรวจสอบราคาและจอง'}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-text-muted">
        {canContact ? (
          <>
            <PhoneIcon size={12} />
            ระบบจะเปิดแชท/โทรหาเราพร้อมสรุปข้อมูลการเดินทางของคุณ
          </>
        ) : (
          'ร้านยังไม่ได้ตั้งช่องทางติดต่อ (LINE/เบอร์โทร)'
        )}
      </p>
    </form>
  );
}
