import { redirect } from 'next/navigation';
import { getStoreUser } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant-context';

// Phase 5 จะมีแดชบอร์ดจริง — ตอนนี้พาไปหน้าสินค้าเป็นหน้าแรกหลัง login
export default async function AdminIndexPage() {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  redirect(user ? '/admin/products' : '/admin/login');
}
