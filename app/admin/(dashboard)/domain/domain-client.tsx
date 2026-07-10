'use client';

// UI ตั้งค่า custom domain — ฟอร์มกรอกโดเมน + ปุ่ม "ตรวจสอบ DNS" รายงานผล 3 เช็คแยกข้อ (§7.5)

import { useActionState, useState } from 'react';
import { submitDomain, type DomainActionState } from './actions';

interface CheckItem {
  name: string;
  passed: boolean;
  detail: string;
}

export function DomainForm({ currentDomain }: { currentDomain: string | null }) {
  const [state, formAction, pending] = useActionState<DomainActionState, FormData>(
    submitDomain,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <label htmlFor="domain" className="mb-1 block text-sm font-medium text-gray-700">
          โดเมนของร้าน (เช่น baannoi.com หรือ www.baannoi.com)
        </label>
        <input
          id="domain"
          name="domain"
          defaultValue={currentDomain ?? ''}
          placeholder="baannoi.com"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : currentDomain ? 'เปลี่ยนโดเมน' : 'เริ่มตั้งค่าโดเมน'}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
      {state.success && (
        <p className="w-full text-sm text-emerald-700">
          บันทึกแล้ว — ตั้งค่า DNS ตามคำแนะนำด้านล่าง แล้วกด &ldquo;ตรวจสอบ DNS&rdquo;
        </p>
      )}
    </form>
  );
}

export function VerifyButton() {
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<CheckItem[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/domain/verify', { method: 'POST' });
      const json = (await res.json()) as {
        status?: string;
        checks?: CheckItem[];
        error?: string;
      };
      if (!res.ok || !json.checks) {
        setError(json.error ?? 'ตรวจสอบไม่สำเร็จ');
        setChecks(null);
        return;
      }
      setChecks(json.checks);
      setStatus(json.status ?? null);
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={verify}
        disabled={checking}
        className="rounded-md border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50"
      >
        {checking ? 'กำลังตรวจสอบ DNS…' : 'ตรวจสอบ DNS'}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {checks && (
        <div className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.name}
              className={`rounded-md border px-3 py-2 text-sm ${
                c.passed
                  ? 'border-green-200 bg-emerald-50 text-green-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <p className="font-medium">
                {c.passed ? '✓' : '✗'} {c.name}
              </p>
              <p className="mt-0.5 text-xs">{c.detail}</p>
            </div>
          ))}
          {status === 'active' && (
            <p className="text-sm font-medium text-emerald-700">
              🎉 โดเมนพร้อมใช้งานแล้ว — ลูกค้าเปิดร้านผ่านโดเมนนี้ได้ทันที
            </p>
          )}
          {status !== 'active' && (
            <p className="text-xs text-gray-400">
              DNS อาจใช้เวลาเผยแพร่ (propagation) ได้ถึง 24 ชั่วโมง — แก้ค่าแล้วรอสักครู่ก่อนตรวจใหม่
            </p>
          )}
        </div>
      )}
    </div>
  );
}
