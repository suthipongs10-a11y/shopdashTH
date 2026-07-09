import { notFound, redirect } from 'next/navigation';
import { getStoreUser, userRole } from '@/lib/auth';
import { formatThaiDate } from '@/lib/format';
import {
  getTenantContextAllowLocked,
  TenantNotFoundError,
  type TenantContext,
} from '@/lib/tenant-context';
import { Nav } from './nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let ctx: TenantContext;
  try {
    ctx = await getTenantContextAllowLocked();
  } catch (err) {
    if (err instanceof TenantNotFoundError) notFound();
    throw err;
  }

  // ต้องเป็น owner/staff "ของร้านนี้" เท่านั้น (§2.4) — บัญชีร้านอื่นถูกปฏิเสธ
  const user = await getStoreUser(ctx);
  if (!user) redirect('/admin/login');

  // §7.4: ร้าน locked เข้าได้เฉพาะหน้าจ่ายเงิน (route group แยก /admin/plan)
  if (ctx.status === 'locked') redirect('/admin/plan');

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav storeName={ctx.store.name} isOwner={userRole(user) === 'store_owner'} />
      {ctx.status === 'grace' && (
        <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-800">
          แพลนหมดอายุแล้ว — อยู่ในช่วงผ่อนผัน กรุณา{' '}
          <a href="/admin/plan" className="font-medium underline underline-offset-2">
            ชำระค่าแพลน
          </a>{' '}
          เพื่อไม่ให้ร้านถูกระงับ
        </div>
      )}
      {ctx.status === 'trial' && ctx.trialEndsAt && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm text-blue-800">
          ช่วงทดลองใช้ถึง {formatThaiDate(ctx.trialEndsAt)} —{' '}
          <a href="/admin/plan" className="font-medium underline underline-offset-2">
            ชำระค่าแพลน
          </a>{' '}
          เพื่อใช้งานต่อเนื่อง
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
