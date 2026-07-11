'use client';

// ลิงก์โซเชียลของร้าน — ค่าไปโชว์เป็นปุ่มวงกลมใน footer หน้าร้าน (ทุกธีม)
// เว้นว่างช่องไหน = ปุ่มนั้นไม่แสดง

import { useActionState } from 'react';
import type { SocialLinks } from '@/lib/theme-content';
import { updateSocialLinks, type SettingsState } from './actions';

const FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/ชื่อเพจ' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/ชื่อบัญชี' },
  { key: 'line', label: 'LINE', placeholder: 'https://line.me/R/ti/p/@ไอดีร้าน' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@ชื่อบัญชี' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@ชื่อช่อง' },
];

export function SocialForm({ values }: { values: SocialLinks }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSocialLinks,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label
              htmlFor={`social_${f.key}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {f.label}
            </label>
            <input
              id={`social_${f.key}`}
              name={`social_${f.key}`}
              type="url"
              defaultValue={values[f.key] ?? ''}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        ปุ่มโซเชียลจะแสดงใน footer ของหน้าร้าน เฉพาะช่องที่กรอกลิงก์ไว้ — เว้นว่าง = ไม่แสดงปุ่มนั้น
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกลิงก์โซเชียล'}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">บันทึกแล้ว — ดูผลได้ที่ footer หน้าร้าน</p>}
      </div>
    </form>
  );
}
