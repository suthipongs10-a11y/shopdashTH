// Guest checkout ฟอร์มเดียว (§2.1) — ไม่มี register/login ฝั่งลูกค้า

import { getTenantContext } from '@/lib/tenant-context';
import { CheckoutClient } from './checkout-client';

export default async function CheckoutPage() {
  const ctx = await getTenantContext();
  return (
    <main className="mx-auto max-w-(--container-max) px-4 py-8">
      <h1 className="mb-6 font-heading text-2xl font-semibold">ชำระเงิน</h1>
      <CheckoutClient
        slug={ctx.slug}
        flatShippingFee={ctx.store.flat_shipping_fee}
        freeShippingMin={ctx.store.free_shipping_min}
      />
    </main>
  );
}
