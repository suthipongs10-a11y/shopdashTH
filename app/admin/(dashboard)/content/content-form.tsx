'use client';

// ฟอร์ม generic ของหน้า "เนื้อหาเว็บ" — render จาก schema (lib/content-schema.ts)
// ไม่มีฟอร์มเฉพาะธีม: object/strings = ช่องกรอกตรงๆ, list = รายการเพิ่ม/ลบ/เลื่อนลำดับได้
// รูปอัปโหลดเข้า R2 ผ่าน kind 'content_image' แล้วเก็บ URL ลง state ก่อนบันทึก

import Image from 'next/image';
import { useActionState, useRef, useState } from 'react';
import type { ContentFieldDef, ContentGroupClient } from '@/lib/content-schema';
import { uploadImage, UploadError } from '@/lib/upload-client';
import { saveContentGroup, type ContentActionState } from './actions';

type Values = Record<string, string>;

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function initialValues(fields: ContentFieldDef[], raw: unknown): Values {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Values = {};
  for (const field of fields) {
    const value = source[field.key];
    if (field.type === 'lines' && Array.isArray(value)) {
      out[field.key] = value.filter((v) => typeof v === 'string').join('\n');
    } else if (typeof value === 'string') {
      out[field.key] = value;
    } else {
      out[field.key] = '';
    }
  }
  return out;
}

function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploaded = await uploadImage('content_image', file);
      onChange(uploaded.publicUrl);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <Image src={value} alt="" fill sizes="96px" className="object-cover" unoptimized />
        </span>
      ) : (
        <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[11px] text-gray-400">
          ไม่มีรูป
        </span>
      )}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
          >
            {uploading ? 'กำลังอัปโหลด…' : value ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-rose-600"
            >
              ลบรูป
            </button>
          )}
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: ContentFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {field.type === 'image' ? (
        <ImageField value={value} onChange={onChange} />
      ) : field.type === 'icon' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">— เลือกไอคอน —</option>
          {(field.iconOptions ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' || field.type === 'lines' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.type === 'lines' ? 3 : 2}
          className={inputCls}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
      )}
      {field.help && <p className="mt-1 text-xs text-gray-500">{field.help}</p>}
    </div>
  );
}

export function ContentGroupForm({
  group,
  initial,
}: {
  group: ContentGroupClient;
  initial: unknown;
}) {
  const isList = group.kind === 'list';
  const [values, setValues] = useState<Values>(() =>
    isList ? {} : initialValues(group.fields, initial),
  );
  const [items, setItems] = useState<Values[]>(() =>
    isList && Array.isArray(initial)
      ? initial.map((item) => initialValues(group.fields, item))
      : [],
  );

  const action = saveContentGroup.bind(null, group.id);
  const [state, formAction, pending] = useActionState<ContentActionState, FormData>(action, {});

  const payload = JSON.stringify(isList ? items : values);
  const maxItems = group.maxItems ?? 10;

  function setItemValue(index: number, key: string, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form
      action={formAction}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-gray-900">{group.title}</h2>
      {group.description && <p className="mt-0.5 text-xs text-gray-500">{group.description}</p>}
      <input type="hidden" name="payload" value={payload} />

      {isList ? (
        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-xs text-gray-400">
              ยังไม่มี{group.itemNoun ?? 'รายการ'} — ธีมจะใช้เนื้อหาตัวอย่างของธีม (ถ้ามี)
            </p>
          )}
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">
                  {group.itemNoun ?? 'รายการ'}ที่ {index + 1}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="เลื่อนขึ้น"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="เลื่อนลง"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:text-rose-600"
                  >
                    ลบ
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : ''}>
                    <Field
                      field={field}
                      value={item[field.key] ?? ''}
                      onChange={(v) => setItemValue(index, field.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length < maxItems && (
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, initialValues(group.fields, {})])
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              + เพิ่ม{group.itemNoun ?? 'รายการ'} ({items.length}/{maxItems})
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {group.fields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : ''}>
              <Field
                field={field}
                value={values[field.key] ?? ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">บันทึกแล้ว — หน้าร้านอัปเดตทันที</p>}
      </div>
    </form>
  );
}
