// หน้าเลือกธีม (งาน 4.1) — ล็อกตาม allowed_theme_tier ของแพลน, สลับแล้วมีผลทันที

import Link from 'next/link';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset, THEME_PRESET_LIST } from '@/themes/presets';
import { AnnouncementForm } from './announcement-form';
import { ThemePicker, type ThemeCardData } from './theme-picker';

export const dynamic = 'force-dynamic';

export default async function ThemePage() {
  const ctx = await getTenantContext();
  const current = getPreset(ctx.store.theme_code);

  const themes: ThemeCardData[] = THEME_PRESET_LIST.map((p) => ({
    code: p.code,
    nameTh: p.nameTh,
    tier: p.tier,
    colors: [
      p.tokens['--color-primary'],
      p.tokens['--color-accent'],
      p.tokens['--color-surface'],
      p.tokens['--color-bg'],
    ],
    fontHeading: p.tokens['--font-heading'],
    customizable: p.customizable === true,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ธีมร้าน</h1>
          <p className="mt-1 text-sm text-gray-500">
            แพลน {ctx.plan.name_th} เลือกธีมได้ถึงระดับ tier {ctx.plan.allowed_theme_tier} —
            ธีมที่ล็อกอยู่ปลดได้ด้วยการอัปเกรดแพลน
          </p>
        </div>
        {current.customizable && (
          <Link
            href="/admin/theme/customize"
            className="rounded-md border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white"
          >
            ปรับแต่งธีมปัจจุบัน →
          </Link>
        )}
      </div>

      <ThemePicker
        themes={themes}
        currentCode={ctx.store.theme_code}
        allowedTier={ctx.plan.allowed_theme_tier}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <AnnouncementForm current={ctx.store.announcement_text} />
      </section>
    </div>
  );
}
