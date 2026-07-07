'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser } from '@/lib/auth';
import { approveSubscription, rejectSubscription } from '@/lib/billing';

export interface SubscriptionActionState {
  error?: string;
  done?: boolean;
}

export async function approveSubscriptionAction(
  subscriptionId: string,
  _prev: SubscriptionActionState,
  _formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const result = await approveSubscription(subscriptionId, user.id, user.email ?? undefined);
  if (!result.ok) return { error: result.error };

  revalidatePath('/subscriptions');
  revalidatePath('/tenants');
  return { done: true };
}

export async function rejectSubscriptionAction(
  subscriptionId: string,
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const reason = String(formData.get('reason') ?? '').trim();
  const result = await rejectSubscription(subscriptionId, reason, user.id, user.email ?? undefined);
  if (!result.ok) return { error: result.error };

  revalidatePath('/subscriptions');
  return { done: true };
}
