// Layout ของหน้า auth (login/forgot-password/reset-password) — ไม่มี nav, ไม่ตรวจ session
// route group (auth) ไม่มีผลกับ URL — ยังคงเป็น /admin/login เป็นต้น

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-6 text-center font-semibold text-gray-900">ShopDash · หลังร้าน</p>
        {children}
      </div>
    </div>
  );
}
