import { TrackClient } from './track-client';

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ num?: string }>;
}) {
  // ?num= — prefill จากกล่อง "ติดตามคำสั่งซื้อ" บนหน้าแรก (ธีม Commerce)
  const { num } = await searchParams;
  return (
    <main className="mx-auto max-w-(--container-max) px-4 py-12">
      <h1 className="mb-2 text-center font-heading text-3xl font-semibold tracking-tight">
        ติดตามคำสั่งซื้อ
      </h1>
      <p className="mb-8 text-center text-sm text-text-muted">
        กรอกเลขออร์เดอร์พร้อมเบอร์โทรที่ใช้สั่งซื้อเพื่อดูสถานะ
      </p>
      <TrackClient initialOrderNumber={num} />
    </main>
  );
}
