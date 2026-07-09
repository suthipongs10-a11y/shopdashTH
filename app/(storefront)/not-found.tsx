import Link from 'next/link';

// 404 ของ storefront (§5.5) — เช่นเปิดหน้าสินค้าที่ไม่มี/ถูกซ่อน
export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-3xl font-semibold text-text">ไม่พบสินค้า</h1>
      <p className="mt-2 text-sm text-text-muted">
        สินค้าที่คุณค้นหาอาจถูกลบหรือยังไม่เผยแพร่
      </p>
      <Link
        href="/products"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
      >
        ดูสินค้าทั้งหมด
      </Link>
    </div>
  );
}
