'use client';

// การ์ดคำขอโดเมนในคิว Super Admin — อนุมัติสลิป / ปฏิเสธ (พร้อมเหตุผล) /
// ตรวจ DNS (เช็คงานตัวเอง) / ทำเสร็จ (ระบบเปิดโดเมนให้ร้านทันที)

/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from 'react';
import {
  approveDomainSlipAction,
  checkRequestDnsAction,
  completeDomainRequestAction,
  rejectDomainRequestAction,
  type DomainAdminActionState,
} from './actions';

const IDLE: DomainAdminActionState = {};

export interface DomainRequestItem {
  id: string;
  storeName: string;
  slug: string;
  domain: string;
  kind: 'new' | 'renewal';
  amount: number;
  status: 'slip_uploaded' | 'in_progress';
  note: string | null;
  slipUrl: string | null;
  createdAtText: string;
}

function RejectForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    rejectDomainRequestAction.bind(null, requestId),
    IDLE,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        ปฏิเสธ…
      </button>
    );
  }
  return (
    <form action={formAction} className="w-full space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
      <label htmlFor={`reason-${requestId}`} className="block text-xs font-medium text-gray-700">
        เหตุผลที่ปฏิเสธ (ร้านค้าจะเห็นข้อความนี้ — เช่น ยอดไม่ตรง / โดเมนไม่ว่าง แนะนำชื่ออื่น)
      </label>
      <textarea
        id={`reason-${requestId}`}
        name="reason"
        required
        rows={2}
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'ยืนยันปฏิเสธ'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function DnsCheckTool({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    checkRequestDnsAction.bind(null, requestId),
    IDLE,
  );
  return (
    <div className="w-full">
      <form action={formAction} className="inline">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? 'กำลังตรวจ DNS…' : 'ตรวจ DNS'}
        </button>
      </form>
      {state.error && <p className="mt-2 text-xs text-rose-600">{state.error}</p>}
      {state.checks && (
        <ul className="mt-2 space-y-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
          {state.checks.map((c) => (
            <li key={c.name} className="flex gap-2">
              <span className={c.passed ? 'text-emerald-600' : 'text-rose-600'}>
                {c.passed ? '✓' : '✗'}
              </span>
              <span>
                <b>{c.name}:</b> {c.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DomainRequestCard({ item }: { item: DomainRequestItem }) {
  const [approveState, approveAction, approving] = useActionState(
    approveDomainSlipAction.bind(null, item.id),
    IDLE,
  );
  const [completeState, completeAction, completing] = useActionState(
    completeDomainRequestAction.bind(null, item.id),
    IDLE,
  );

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-5">
        {/* สลิป */}
        <div className="w-40 shrink-0">
          {item.slipUrl ? (
            <a href={item.slipUrl} target="_blank" rel="noreferrer">
              <img
                src={item.slipUrl}
                alt={`สลิปคำขอโดเมน ${item.domain}`}
                className="max-h-56 w-full rounded-md border border-gray-200 object-contain"
              />
            </a>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
              ไม่มีสลิป
            </div>
          )}
        </div>

        {/* รายละเอียด */}
        <div className="min-w-64 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-gray-900">{item.domain}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.kind === 'renewal'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {item.kind === 'renewal' ? 'ต่ออายุ' : 'จดใหม่'}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              ฿{item.amount.toLocaleString('th-TH')}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            ร้าน: <b>{item.storeName}</b> ({item.slug}) · ส่งคำขอ {item.createdAtText}
          </p>
          {item.note && (
            <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              หมายเหตุจากร้าน: {item.note}
            </p>
          )}

          {item.status === 'in_progress' && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs leading-relaxed text-indigo-900">
              <b>ขั้นตอนที่ต้องทำ (ดู DEPLOYMENT.md §โดเมนลูกค้า):</b>
              <ol className="ml-4 mt-1 list-decimal space-y-0.5">
                <li>{item.kind === 'renewal' ? 'ต่ออายุโดเมนที่ registrar' : 'จดโดเมนที่ registrar (ตรวจความว่างก่อน)'}</li>
                {item.kind === 'new' && <li>ตั้ง DNS: CNAME/A ชี้เข้าระบบตามคู่มือ</li>}
                {item.kind === 'new' && <li>เพิ่มโดเมนเข้าโปรเจกต์ Vercel (ให้ออก TLS cert)</li>}
                <li>กด "ตรวจ DNS" ให้ผ่านอย่างน้อยเช็ค CNAME/A + HTTPS</li>
                <li>กด "ทำเสร็จ" — ระบบเปิดโดเมนให้ร้านทันที</li>
              </ol>
            </div>
          )}

          {/* ปุ่มตาม state */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {item.status === 'slip_uploaded' && (
              <form action={approveAction} className="inline">
                <button
                  type="submit"
                  disabled={approving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {approving ? 'กำลังบันทึก…' : 'อนุมัติสลิป — เริ่มดำเนินการ'}
                </button>
              </form>
            )}
            {item.status === 'in_progress' && (
              <form
                action={completeAction}
                onSubmit={(e) => {
                  if (!confirm(`ยืนยันว่าตั้งค่าโดเมน ${item.domain} เสร็จแล้ว? ระบบจะเปิดใช้ทันที`))
                    e.preventDefault();
                }}
                className="inline"
              >
                <button
                  type="submit"
                  disabled={completing}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {completing ? 'กำลังบันทึก…' : 'ทำเสร็จ — เปิดใช้โดเมน'}
                </button>
              </form>
            )}
            <RejectForm requestId={item.id} />
          </div>
          {(approveState.error || completeState.error) && (
            <p className="text-sm text-rose-600">{approveState.error ?? completeState.error}</p>
          )}

          {item.status === 'in_progress' && <DnsCheckTool requestId={item.id} />}
        </div>
      </div>
    </div>
  );
}
