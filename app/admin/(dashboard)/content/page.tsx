// หน้า "เนื้อหาเว็บ" — แก้ข้อความ/รูปประกอบของเทมเพลต (ไม่ใช่รูปสินค้า) ด้วยตัวเอง
// ฟอร์มทั้งหมด generate จาก schema กลาง โชว์เฉพาะกลุ่มที่ธีมปัจจุบันใช้จริง (T1–T4 ครบ)
// ค่าเก็บใน theme_overrides.__content — เว้นว่าง = ใช้ค่า default ของธีม

import Link from 'next/link';
import {
  type ContentGroupClient,
  groupsForPreset,
  heroCropAspect,
  toClientGroup,
} from '@/lib/content-schema';
import { getThemeContent } from '@/lib/theme-content';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { ContentGroupForm } from './content-form';

export default async function ContentPage() {
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);
  const content = getThemeContent(ctx.store.theme_overrides) as Record<string, unknown>;
  const groups = groupsForPreset(preset);

  // hero สัดส่วนกรอบครอปต่างกันตามธีม — ฉีดเข้า field imageUrl ของกลุ่ม hero
  const heroAspect = heroCropAspect(preset.variants.hero);
  const clientGroup = (group: (typeof groups)[number]): ContentGroupClient => {
    const cg = toClientGroup(group);
    if (group.id !== 'hero') return cg;
    return {
      ...cg,
      fields: cg.fields.map((f) => (f.key === 'imageUrl' ? { ...f, aspect: heroAspect } : f)),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">เนื้อหาเว็บ</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            ข้อความและรูปประกอบของธีม "{preset.nameTh}" — โลโก้/แบนเนอร์หลัก/ชื่อร้านแก้ที่{' '}
            <Link href="/admin/settings" className="text-indigo-600 hover:underline">
              ตั้งค่าร้าน
            </Link>{' '}
            ข้อความประกาศแก้ที่{' '}
            <Link href="/admin/theme" className="text-indigo-600 hover:underline">
              ธีมร้าน
            </Link>
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
        >
          ดูหน้าร้าน ↗
        </a>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          ธีมปัจจุบันไม่มีส่วนเนื้อหาพิเศษให้ปรับ — แบนเนอร์/โลโก้/ชื่อร้านแก้ได้ที่{' '}
          <Link href="/admin/settings" className="text-indigo-600 hover:underline">
            ตั้งค่าร้าน
          </Link>
          {' '}หรือเปลี่ยนไปใช้ธีมชุด Commerce ที่เมนู{' '}
          <Link href="/admin/theme" className="text-indigo-600 hover:underline">
            ธีมร้าน
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <ContentGroupForm
            key={group.id}
            group={clientGroup(group)}
            initial={
              group.kind === 'strings'
                ? Object.fromEntries(group.fields.map((f) => [f.key, content[f.key]]))
                : content[group.contentKey!]
            }
          />
        ))
      )}
    </div>
  );
}
