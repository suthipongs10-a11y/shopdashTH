import { redirect } from 'next/navigation';
import { getSuperAdminUser } from '@/lib/auth';
import { SuperLoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLoginPage() {
  const user = await getSuperAdminUser();
  if (user) redirect('/tenants');
  return <SuperLoginForm />;
}
