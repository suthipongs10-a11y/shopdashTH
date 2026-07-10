import Link from 'next/link';

// 404 ของ storefront (§5.5) — เช่นเปิดหน้าสินค้าที่ไม่มี/ถูกซ่อน
export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-6xl font-bold text-primary-soft" aria-hidden>
        404
      </p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-text">
        ไม่พบหน้าที่ต้องการ
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        สินค้าหรือหน้าที่คุณค้นหาอาจถูกลบหรือยังไม่เผยแพร่
      </p>
      <Link
        href="/products"
        className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        ดูสินค้าทั้งหมด
      </Link>
    </div>
  );
}
