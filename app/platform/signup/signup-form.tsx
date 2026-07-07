'use client';

// ฟอร์ม signup — เช็ค slug realtime (debounce 400ms) + POST /api/signup
// สำเร็จแล้วโชว์ลิงก์เข้า {slug}.<root>/admin (session cookie แยกต่อ host จึงให้ login ที่ร้าน)

import { useEffect, useRef, useState } from 'react';

export interface SignupPlan {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken'; reason: string };

/** URL หลังร้านของ slug — dev: {slug}.localhost:3000, prod: {slug}.{root} */
function tenantAdminUrl(slug: string): string {
  const { protocol, host } = window.location;
  const bare = host.split(':')[0];
  const port = host.includes(':') ? `:${host.split(':')[1]}` : '';
  const root = bare === 'localhost' || bare.endsWith('.localhost')
    ? 'localhost'
    : bare.replace(/^www\./, '');
  return `${protocol}//${slug}.${root}${port}/admin`;
}

export function SignupForm({
  plans,
  preselectCode,
}: {
  plans: SignupPlan[];
  preselectCode?: string;
}) {
  const [planId, setPlanId] = useState<string>(
    plans.find((p) => p.code === preselectCode)?.id ?? plans[0]?.id ?? '',
  );
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // เช็ค slug ว่างแบบ realtime
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = slug.trim().toLowerCase();
    if (!value) {
      setSlugStatus({ state: 'idle' });
      return;
    }
    setSlugStatus({ state: 'checking' });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup?slug=${encodeURIComponent(value)}`);
        const data = (await res.json()) as { available: boolean; reason?: string };
        setSlugStatus(
          data.available
            ? { state: 'available' }
            : { state: 'taken', reason: data.reason ?? 'ใช้ชื่อนี้ไม่ได้' },
        );
      } catch {
        setSlugStatus({ state: 'idle' });
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: form.get('storeName'),
          slug: String(form.get('slug') ?? '').toLowerCase(),
          email: form.get('email'),
          password: form.get('password'),
          phone: form.get('phone'),
          planId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; slug?: string; error?: string };
      if (!res.ok || !data.ok || !data.slug) {
        setError(data.error ?? 'สมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      setDoneSlug(data.slug);
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  if (doneSlug) {
    const adminUrl = tenantAdminUrl(doneSlug);
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-800">เปิดร้านสำเร็จ! 🎉</h2>
        <p className="mt-2 text-sm text-green-700">
          ร้านของคุณพร้อมใช้งานแล้วที่ <span className="font-medium">{doneSlug}</span> —
          เข้าหลังร้านด้วยอีเมลและรหัสผ่านที่สมัครไว้ แล้วเริ่มจาก ใส่ PromptPay → เพิ่มสินค้าแรก →
          เลือกธีม
        </p>
        <a
          href={adminUrl}
          className="mt-4 inline-block rounded-md bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          เข้าหลังร้านของฉัน →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">เลือกแพลน (ทดลองฟรี 7 วัน)</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`cursor-pointer rounded-lg border p-3 text-center text-sm ${
                planId === plan.id
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="planId"
                value={plan.id}
                checked={planId === plan.id}
                onChange={() => setPlanId(plan.id)}
                className="sr-only"
              />
              <span className="block font-medium">{plan.name_th}</span>
              <span className={planId === plan.id ? 'text-gray-300' : 'text-gray-400'}>
                ฿{plan.price_yearly.toLocaleString('th-TH')}/ปี
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="storeName" className="mb-1 block text-sm font-medium text-gray-700">
          ชื่อร้าน
        </label>
        <input id="storeName" name="storeName" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
          ที่อยู่ร้าน (subdomain)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="baannoi"
            className={inputClass}
            autoComplete="off"
          />
          <span className="shrink-0 text-sm text-gray-400">.shopdash.co</span>
        </div>
        {slugStatus.state === 'checking' && (
          <p className="mt-1 text-xs text-gray-400">กำลังตรวจสอบ…</p>
        )}
        {slugStatus.state === 'available' && (
          <p className="mt-1 text-xs text-green-600">✓ ใช้ชื่อนี้ได้</p>
        )}
        {slugStatus.state === 'taken' && (
          <p className="mt-1 text-xs text-red-600">{slugStatus.reason}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            อีเมล (ใช้เข้าหลังร้าน)
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            เบอร์โทร
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            pattern="0[0-9]{8,9}"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || slugStatus.state === 'taken'}
        className="w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? 'กำลังสร้างร้าน…' : 'เปิดร้านเลย'}
      </button>
    </form>
  );
}
