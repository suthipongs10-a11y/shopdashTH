'use client';

import { useRouter } from 'next/navigation';
import { SlipUploader } from '@/components/storefront/SlipUploader';

export function SlipUploadClient({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();

  async function handleUpload(file: File) {
    const form = new FormData();
    form.set('orderNumber', orderNumber);
    form.set('file', file);
    const res = await fetch('/api/slips', { method: 'POST', body: form });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (res.ok && json.ok) {
      // refresh ให้หน้าเปลี่ยนเป็นสถานะ "รอตรวจสอบสลิป"
      setTimeout(() => router.refresh(), 1200);
      return { ok: true };
    }
    return { ok: false, message: json.error };
  }

  return <SlipUploader onUpload={handleUpload} />;
}
