'use client';

// การ์ด "เติมเนื้อหาตัวอย่าง" บนหน้า /admin/content — ช่วยร้านเก่า/ร้านที่สลับมาธีม Commerce
// แล้วเจอหน้าโล่ง ให้เห็นภาพร้านสวยเต็มก่อน แล้วค่อยแก้เป็นของตัวเอง

import { useState, useTransition } from 'react';
import { loadStarterSample, type LoadSampleState } from './load-sample-actions';

export interface SamplePackOption {
  code: string;
  nameTh: string;
}

export function LoadSampleCard({
  packs,
  hasSampleProducts,
}: {
  packs: SamplePackOption[];
  hasSampleProducts: boolean;
}) {
  const [packCode, setPackCode] = useState(packs[0]?.code ?? 'fashion');
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<LoadSampleState>({});

  function run() {
    setState({});
    const form = new FormData();
    form.set('pack_code', packCode);
    startTransition(async () => {
      setState(await loadStarterSample({}, form));
      setConfirming(false);
    });
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-indigo-900">เริ่มเร็วด้วยชุดตัวอย่าง</h2>
      <p className="mt-1.5 text-sm text-indigo-800">
        เติมเนื้อหาตัวอย่าง (แบนเนอร์ hero, แถบจุดเด่น, แบนเนอร์หมวด) พร้อม
        <b> สินค้าตัวอย่างครบชุด</b> ให้เห็นภาพร้านสวยเต็มก่อน แล้วค่อยแก้แต่ละส่วนเป็นของคุณเอง —
        สีธีมและข้อมูลที่คุณตั้งไว้จะไม่ถูกแตะ
      </p>
      {hasSampleProducts && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          ร้านคุณมีสินค้าตัวอย่างอยู่แล้ว — กดเติมใหม่จะแทนที่ชุดตัวอย่างเดิม (สินค้าจริงที่คุณสร้าง/แก้เองไม่หาย)
        </p>
      )}

      {packs.length > 1 && (
        <div className="mt-3">
          <label htmlFor="pack_code" className="mb-1 block text-xs font-bold text-indigo-900">
            เลือกแนวร้าน
          </label>
          <select
            id="pack_code"
            value={packCode}
            onChange={(e) => setPackCode(e.target.value)}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {packs.map((p) => (
              <option key={p.code} value={p.code}>
                {p.nameTh}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs font-semibold text-indigo-900">ยืนยันเติมชุดตัวอย่าง?</span>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? 'กำลังเติม…' : 'ยืนยัน เติมเลย'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
            >
              ยกเลิก
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            เติมเนื้อหา + สินค้าตัวอย่าง
          </button>
        )}
        {state.error && <p className="text-sm font-semibold text-rose-600">{state.error}</p>}
        {state.done && (
          <p className="text-sm font-semibold text-emerald-700">
            เติมแล้ว — เปิดหน้าร้านดูได้เลย แล้วแก้แต่ละส่วนให้เป็นของคุณ
          </p>
        )}
      </div>
    </div>
  );
}
