import Link from 'next/link';
import { ArrowRightIcon } from './icons';

// หัวข้อ section มาตรฐานของ storefront — eyebrow เล็กสี primary + หัวข้อใหญ่ + ลิงก์ขวา
export function SectionHeading({
  eyebrow,
  title,
  linkText,
  linkHref,
}: {
  eyebrow?: string;
  title: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-widest text-primary">{eyebrow}</p>
        )}
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-text">{title}</h2>
      </div>
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
        >
          {linkText}
          <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
