// หน้า "ปรับแต่งธีม" (งาน 4.3 — §4.6) — gate ด้วย flag theme_customize ตามแพลน
// (Billing v2: เดิมผูกกับธีม prem-01/02 — ตอนนี้แพลนที่เปิด flag ปรับได้ทุกธีม)

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { FONT_VAR } from '@/themes/fonts';
import { CustomizeForm } from './customize-form';

export const dynamic = 'force-dynamic';

export default async function CustomizeThemePage() {
  const ctx = await getTenantContext();
  const preset = getPreset(ctx.store.theme_code);
  if (!ctx.features.theme_customize) redirect('/admin/theme');

  const overrides = ctx.store.theme_overrides as Record<string, string>;
  const effective = (token: keyof typeof preset.tokens) =>
    overrides[token] ?? preset.tokens[token];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/theme" className="text-xs text-gray-400 hover:text-gray-600">
          ← ธีมร้าน
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          ปรับแต่งธีม &ldquo;{preset.nameTh}&rdquo;
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          การเปลี่ยนแปลงมีผลกับหน้าร้านทันที — กด &ldquo;คืนค่าธีมเดิม&rdquo; เพื่อล้างการปรับแต่งทั้งหมด
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <CustomizeForm
          defaults={{
            primary: effective('--color-primary'),
            accent: effective('--color-accent'),
            radiusMd: effective('--radius-md'),
            fontHeading: effective('--font-heading'),
            fontBody: effective('--font-body'),
          }}
          fontNames={Object.keys(FONT_VAR)}
        />
      </section>
    </div>
  );
}
