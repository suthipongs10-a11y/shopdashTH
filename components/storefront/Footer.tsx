import Link from 'next/link';

export interface FooterPageLink {
  slug: string;
  title: string;
}

export function Footer({
  storeName,
  address,
  phone,
  pages = [],
}: {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  /** หน้าเพจเผยแพร่ที่ตั้ง show_in_nav (Phase 6 — flag custom_pages) */
  pages?: FooterPageLink[];
}) {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-(--container-max) space-y-2 px-4 py-8">
        <p className="font-heading font-medium">{storeName}</p>
        {address && <p className="text-sm text-text-muted">{address}</p>}
        {phone && (
          <p className="text-sm text-text-muted">
            โทร:{' '}
            <a href={`tel:${phone}`} className="underline underline-offset-2 hover:text-text">
              {phone}
            </a>
          </p>
        )}
        <p className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
          <Link href="/track" className="underline underline-offset-2 hover:text-primary">
            ติดตามคำสั่งซื้อ
          </Link>
          {pages.map((p) => (
            <Link
              key={p.slug}
              href={`/p/${p.slug}`}
              className="underline underline-offset-2 hover:text-primary"
            >
              {p.title}
            </Link>
          ))}
        </p>
        <p className="pt-4 text-xs text-text-muted">ขับเคลื่อนโดย ShopDash</p>
      </div>
    </footer>
  );
}
