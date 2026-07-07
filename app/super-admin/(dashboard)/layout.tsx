import { redirect } from 'next/navigation';
import { getSuperAdminUser } from '@/lib/auth';
import { SuperNav } from './nav';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // guard: เฉพาะ role super_admin (§3.1) — บัญชีอื่นเด้งไป login
  const user = await getSuperAdminUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperNav email={user.email ?? ''} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
