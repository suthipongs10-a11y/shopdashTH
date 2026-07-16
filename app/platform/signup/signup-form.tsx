'use client';

// ฟอร์ม signup — เช็ค slug realtime (debounce 400ms) + POST /api/signup
// สำเร็จแล้วโชว์ลิงก์เข้า {slug}.<root>/admin (session cookie แยกต่อ host จึงให้ login ที่ร้าน)

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export interface SignupPlan {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
  price_renewal: number | null;
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

export interface SignupPack {
  code: string;
  nameTh: string;
}

export function SignupForm({
  plans,
  preselectCode,
  rootDomain,
  packs = [],
}: {
  plans: SignupPlan[];
  preselectCode?: string;
  rootDomain: string;
  /** starter pack ที่ asset พร้อม — มีตัวเดียว = ไม่ต้องถาม ใช้ตัวนั้นเลย */
  packs?: SignupPack[];
}) {
  const [planId, setPlanId] = useState<string>(
    plans.find((p) => p.code === preselectCode)?.id ?? plans[0]?.id ?? '',
  );
  const [packCode, setPackCode] = useState<string>(packs[0]?.code ?? '');
  const [startMode, setStartMode] = useState<'sample' | 'blank'>('sample');
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
          storeType: packCode || undefined,
          startMode,
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
        <div className="grid gap-2 sm:grid-cols-2">
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
                ฿{plan.price_yearly.toLocaleString('th-TH')}/ปีแรก
                {plan.price_renewal !== null && (
                  <span className="block text-xs">
                    ต่ออายุ ฿{plan.price_renewal.toLocaleString('th-TH')}/ปี
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* จุดเริ่มต้นร้าน — ลูกค้าเลือกเอง: ร้านพร้อมข้อมูลตัวอย่าง vs ร้านว่าง (มีรูปเทียบให้เห็น) */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">เลือกจุดเริ่มต้นของร้านคุณ</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
              startMode === 'sample'
                ? 'border-gray-900 ring-1 ring-gray-900'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="startMode"
              value="sample"
              checked={startMode === 'sample'}
              onChange={() => setStartMode('sample')}
              className="sr-only"
            />
            <span className="relative block aspect-[1440/1000] bg-gray-100">
              <Image
                src="/marketing/templates/t2-store.webp"
                alt="ตัวอย่างร้านที่มีสินค้าตัวอย่างครบ"
                fill
                sizes="(max-width: 640px) 100vw, 300px"
                className="object-cover object-top"
              />
              <span className="absolute left-2 top-2 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                แนะนำ
              </span>
            </span>
            <span className="block p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    startMode === 'sample' ? 'border-gray-900' : 'border-gray-300'
                  }`}
                >
                  {startMode === 'sample' && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                </span>
                เริ่มพร้อมข้อมูลตัวอย่าง
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                ได้ร้านสวยครบทันที: สินค้าตัวอย่างพร้อมรูป หมวดหมู่ และแบนเนอร์ —
                แค่แก้เป็นสินค้าของคุณ หรือลบทั้งชุดได้ในคลิกเดียวเมื่อพร้อม
              </span>
            </span>
          </label>

          <label
            className={`cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
              startMode === 'blank'
                ? 'border-gray-900 ring-1 ring-gray-900'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="startMode"
              value="blank"
              checked={startMode === 'blank'}
              onChange={() => setStartMode('blank')}
              className="sr-only"
            />
            <span className="relative block aspect-[1440/1000] bg-gray-100">
              <Image
                src="/marketing/signup/start-blank.webp"
                alt="ตัวอย่างร้านว่างที่ยังไม่มีสินค้า"
                fill
                sizes="(max-width: 640px) 100vw, 300px"
                className="object-cover object-top"
              />
            </span>
            <span className="block p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    startMode === 'blank' ? 'border-gray-900' : 'border-gray-300'
                  }`}
                >
                  {startMode === 'blank' && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                </span>
                เริ่มจากร้านว่าง
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                โครงเว็บเปล่า ไม่มีสินค้าตัวอย่าง — เหมาะเมื่อคุณมีรูปและข้อมูลสินค้าพร้อมลงเองอยู่แล้ว
                (เปลี่ยนใจทีหลังกดเติมชุดตัวอย่างได้ที่เมนู "เนื้อหาเว็บ")
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* ประเภทร้าน = starter pack ตัวอย่างที่จะได้ — โชว์เมื่อเลือกแบบมีตัวอย่าง และมี pack >1 */}
      {startMode === 'sample' && packs.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            ร้านคุณขายอะไร (เราจะจัดร้านตัวอย่างให้ตรงแนว)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {packs.map((pack) => (
              <label
                key={pack.code}
                className={`cursor-pointer rounded-lg border p-3 text-center text-sm ${
                  packCode === pack.code
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="storeType"
                  value={pack.code}
                  checked={packCode === pack.code}
                  onChange={() => setPackCode(pack.code)}
                  className="sr-only"
                />
                <span className="block font-medium">{pack.nameTh}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
          <span className="shrink-0 text-sm text-gray-400">.{rootDomain}</span>
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

      <p className="text-center text-xs text-gray-400">
        การกด &ldquo;เปิดร้านเลย&rdquo; ถือว่ายอมรับ{' '}
        <a href="/terms" target="_blank" className="underline hover:text-gray-600">
          ข้อตกลงการใช้งาน
        </a>{' '}
        และ{' '}
        <a href="/privacy" target="_blank" className="underline hover:text-gray-600">
          นโยบายความเป็นส่วนตัว
        </a>
      </p>
    </form>
  );
}
