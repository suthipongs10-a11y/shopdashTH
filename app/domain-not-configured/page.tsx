// ปลายทาง rewrite ของ middleware เมื่อ host ไม่ตรงกับร้านใด (§1.4)

export default function DomainNotConfiguredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">ไม่พบร้านค้าสำหรับโดเมนนี้</h1>
        <p className="mt-3 text-sm text-gray-500">
          โดเมนนี้ยังไม่ได้เชื่อมต่อกับร้านค้าใดในระบบ ShopDash —
          หากคุณเป็นเจ้าของร้าน กรุณาตรวจสอบการตั้งค่าโดเมน
        </p>
      </div>
    </main>
  );
}
