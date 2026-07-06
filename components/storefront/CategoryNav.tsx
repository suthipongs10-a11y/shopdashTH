import Link from 'next/link';
import type { CategoryNavVariant } from '@/themes/types';
import type { CategoryItem } from './types';

export function CategoryNav({
  categories,
  activeId,
  variant = 'topbar',
}: {
  categories: CategoryItem[];
  activeId?: string;
  variant?: CategoryNavVariant;
}) {
  if (categories.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <nav aria-label="หมวดหมู่สินค้า">
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={c.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface ${
                  c.id === activeId ? 'bg-surface font-medium text-primary' : 'text-text'
                }`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (variant === 'pills') {
    return (
      <nav aria-label="หมวดหมู่สินค้า" className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              c.id === activeId
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-border text-text hover:border-primary'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
    );
  }

  // topbar (ดีฟอลต์กลุ่ม Basic — เลื่อนแนวนอนได้บนมือถือ)
  return (
    <nav aria-label="หมวดหมู่สินค้า" className="overflow-x-auto">
      <ul className="flex items-center gap-6 whitespace-nowrap">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={c.href}
              className={`text-sm transition-colors hover:text-primary ${
                c.id === activeId
                  ? 'font-medium text-primary underline underline-offset-8'
                  : 'text-text'
              }`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
