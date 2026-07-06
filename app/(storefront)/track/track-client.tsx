'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { OrderTracker } from '@/components/storefront/OrderTracker';
import { trackOrder, type TrackState } from './actions';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary';

export function TrackClient() {
  const [state, formAction, pending] = useActionState<TrackState, FormData>(trackOrder, {});

  return (
    <div className="space-y-8">
      <form action={formAction} className="mx-auto max-w-md space-y-4">
        <div>
          <label htmlFor="order_number" className="mb-1 block text-sm font-medium">
            เลขออร์เดอร์
          </label>
          <input
            key={`on-${state.orderNumber ?? ''}`}
            id="order_number"
            name="order_number"
            required
            defaultValue={state.orderNumber ?? ''}
            placeholder="เช่น DEMO-260707-0001"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            เบอร์โทรศัพท์ที่ใช้สั่งซื้อ
          </label>
          <input
            key={`ph-${state.phone ?? ''}`}
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            required
            defaultValue={state.phone ?? ''}
            placeholder="08XXXXXXXX"
            className={inputClass}
          />
        </div>
        {state.error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'กำลังค้นหา…' : 'ตรวจสอบสถานะ'}
        </button>
      </form>

      {state.order && (
        <div className="mx-auto max-w-lg space-y-4">
          <OrderTracker order={state.order} />
          {state.order.status === 'pending_payment' && (
            <p className="text-center text-sm">
              <Link
                href={`/orders/${state.order.orderNumber}/pay`}
                className="text-primary underline underline-offset-2"
              >
                ไปหน้าชำระเงิน / อัปโหลดสลิป →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
