import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;
  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {reset === 'success' && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
        </p>
      )}
      <LoginForm />
    </div>
  );
}
