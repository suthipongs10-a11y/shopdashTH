// Layout ของหน้า auth (login/forgot-password/reset-password) — ไม่มี nav, ไม่ตรวจ session
// route group (auth) ไม่มีผลกับ URL — ยังคงเป็น /admin/login เป็นต้น

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 [background-image:radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,.25),transparent)]">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </span>
          <div className="text-center">
            <p className="text-base font-semibold text-white">ShopDash · หลังร้าน</p>
            <p className="mt-0.5 text-xs text-gray-400">ระบบจัดการร้านค้าออนไลน์ของคุณ</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}
