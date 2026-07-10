'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { UploadError, uploadImage } from '@/lib/upload-client';
import { updateBrandingKey, updateStoreSettings, type SettingsState } from './actions';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

const initial: SettingsState = {};

function BrandingUploader({
  kind,
  label,
  currentUrl,
}: {
  kind: 'logo' | 'banner';
  label: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadImage(kind === 'logo' ? 'branding_logo' : 'branding_banner', file);
      const result = await updateBrandingKey(kind, uploaded.key);
      if (result.error) {
        setError(result.error);
      } else {
        // cache-bust เพราะ key แบรนดิ้งเป็นชื่อไฟล์คงที่ (§3.9)
        setUrl(`${uploaded.publicUrl}?v=${Date.now()}`);
      }
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const isLogo = kind === 'logo';
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className={`relative overflow-hidden rounded-md border border-gray-200 bg-gray-50 ${
            isLogo ? 'h-16 w-16' : 'h-16 w-40'
          }`}
        >
          {url && <Image src={url} alt={label} fill unoptimized className="object-cover" />}
        </div>
        <label
          className={`cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            disabled={busy}
            className="sr-only"
          />
          {busy ? 'กำลังอัปโหลด…' : url ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export interface SettingsFormValues {
  name: string;
  promptpay_id: string | null;
  promptpay_account_name: string | null;
  address: string | null;
  phone: string | null;
  flat_shipping_fee: number;
  free_shipping_min: number | null;
  order_cutoff_time: string | null;
  shipping_note_th: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export function SettingsForm({ values }: { values: SettingsFormValues }) {
  const [state, formAction, pending] = useActionState(updateStoreSettings, initial);

  return (
    <div className="max-w-xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">โลโก้และแบนเนอร์</h2>
        <BrandingUploader kind="logo" label="โลโก้ร้าน" currentUrl={values.logoUrl} />
        <BrandingUploader kind="banner" label="แบนเนอร์หน้าแรก (แนะนำ 21:9)" currentUrl={values.bannerUrl} />
      </section>

      <form action={formAction} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">ข้อมูลร้าน</h2>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            ชื่อร้าน <span className="text-red-600">*</span>
          </label>
          <input id="name" name="name" required defaultValue={values.name} className={inputClass} />
        </div>

        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-yellow-800">
            บัญชีรับเงิน PromptPay — เงินค่าสินค้าเข้าบัญชีนี้โดยตรง
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="promptpay_id" className="mb-1 block text-sm font-medium text-gray-700">
                PromptPay ID (เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)
              </label>
              <input
                id="promptpay_id"
                name="promptpay_id"
                inputMode="numeric"
                maxLength={13}
                defaultValue={values.promptpay_id ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="promptpay_account_name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                ชื่อบัญชี (แสดงให้ลูกค้าเทียบตอนโอน)
              </label>
              <input
                id="promptpay_account_name"
                name="promptpay_account_name"
                defaultValue={values.promptpay_account_name ?? ''}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="flat_shipping_fee" className="mb-1 block text-sm font-medium text-gray-700">
              ค่าส่งต่อออร์เดอร์ (บาท)
            </label>
            <input
              id="flat_shipping_fee"
              name="flat_shipping_fee"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={values.flat_shipping_fee}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="free_shipping_min" className="mb-1 block text-sm font-medium text-gray-700">
              ยอดขั้นต่ำส่งฟรี (เว้นว่าง = ไม่มี)
            </label>
            <input
              id="free_shipping_min"
              name="free_shipping_min"
              type="number"
              min={1}
              step={1}
              defaultValue={values.free_shipping_min ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="order_cutoff_time" className="mb-1 block text-sm font-medium text-gray-700">
              เวลาตัดรอบจัดส่งรายวัน (เว้นว่าง = ไม่แสดง)
            </label>
            <input
              id="order_cutoff_time"
              name="order_cutoff_time"
              type="time"
              defaultValue={values.order_cutoff_time ?? ''}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              แสดงในหน้าสรุปคำสั่งซื้อของลูกค้า เช่น &ldquo;ชำระก่อน 14:00 น. จัดส่งวันเดียวกัน&rdquo;
            </p>
          </div>
          <div>
            <label htmlFor="shipping_note_th" className="mb-1 block text-sm font-medium text-gray-700">
              หมายเหตุการจัดส่ง (แสดงให้ลูกค้า)
            </label>
            <textarea
              id="shipping_note_th"
              name="shipping_note_th"
              rows={3}
              placeholder="เช่น จัดส่งทุกวันจันทร์–เสาร์ งดส่งวันอาทิตย์และวันหยุดนักขัตฤกษ์"
              defaultValue={values.shipping_note_th ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
            ที่อยู่ร้าน (แสดงใน footer หน้าร้าน)
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            defaultValue={values.address ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            เบอร์ติดต่อร้าน
          </label>
          <input id="phone" name="phone" defaultValue={values.phone ?? ''} className={inputClass} />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-600">บันทึกแล้ว</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
        </button>
      </form>
    </div>
  );
}
