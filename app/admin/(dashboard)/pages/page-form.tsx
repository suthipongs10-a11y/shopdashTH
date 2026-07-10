'use client';

// ฟอร์มสร้าง/แก้ไขหน้าเพจ — เนื้อหาเป็น textarea แสดงแบบ pre-wrap
// (แนวเดียวกับคำอธิบายสินค้า §2.3 "rich text แบบง่าย")

import { useActionState } from 'react';
import { createPage, updatePage, type PageActionState } from './actions';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

export interface PageFormValues {
  id: string;
  slug: string;
  title: string;
  body_md: string | null;
  show_in_nav: boolean;
  sort_order: number;
  status: 'draft' | 'published';
}

export function PageForm({ page }: { page?: PageFormValues }) {
  const action = page ? updatePage.bind(null, page.id) : createPage;
  const [state, formAction, pending] = useActionState<PageActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
            ชื่อหน้า <span className="text-red-600">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="เช่น เกี่ยวกับเรา"
            defaultValue={page?.title ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
            ลิงก์ (slug) <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400">/p/</span>
            <input
              id="slug"
              name="slug"
              required
              placeholder="about-us"
              defaultValue={page?.slug ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="body_md" className="mb-1 block text-sm font-medium text-gray-700">
          เนื้อหา
        </label>
        <textarea
          id="body_md"
          name="body_md"
          rows={10}
          placeholder="เขียนเนื้อหาของหน้านี้…"
          defaultValue={page?.body_md ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            สถานะ
          </label>
          <select id="status" name="status" defaultValue={page?.status ?? 'draft'} className={inputClass}>
            <option value="draft">ฉบับร่าง (ยังไม่แสดง)</option>
            <option value="published">เผยแพร่</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-medium text-gray-700">
            ลำดับ
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={page?.sort_order ?? 0}
            className={`${inputClass} w-24`}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" name="show_in_nav" defaultChecked={page?.show_in_nav ?? true} />
          แสดงลิงก์ใน footer หน้าร้าน
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.done && <p className="text-sm text-green-600">บันทึกแล้ว</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : page ? 'บันทึกหน้า' : 'สร้างหน้าใหม่'}
      </button>
    </form>
  );
}
