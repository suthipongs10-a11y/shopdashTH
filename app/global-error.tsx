'use client';

// Global error boundary — จับ error ที่เกิดใน root layout เอง (แทน html/body ทั้งชุด)
// ต้องมี html/body และใช้ inline style เพราะ CSS ปกติอาจยังไม่โหลด
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f9fafb',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center', padding: '0 16px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#111827' }}>เกิดข้อผิดพลาด</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#6b7280' }}>
            ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              borderRadius: 6,
              background: '#111827',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
