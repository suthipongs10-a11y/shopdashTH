import { redirect } from 'next/navigation';
import { getStoreUser } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant-context';

// แดชบอร์ดเป็นหน้าแรกหลัง login (Phase 5 §5.2)
export default async function AdminIndexPage() {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  redirect(user ? '/admin/dashboard' : '/admin/login');
}
