import Link from 'next/link';

export function Footer({
  storeName,
  address,
  phone,
}: {
  storeName: string;
  address?: string | null;
  phone?: string | null;
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
        <p className="pt-2 text-sm">
          <Link href="/track" className="underline underline-offset-2 hover:text-primary">
            ติดตามคำสั่งซื้อ
          </Link>
        </p>
        <p className="pt-4 text-xs text-text-muted">ขับเคลื่อนโดย ShopDash</p>
      </div>
    </footer>
  );
}
