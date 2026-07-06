import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';
import { Nav } from './nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const ctx = await getTenantContext();

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav storeName={ctx.store.name} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
