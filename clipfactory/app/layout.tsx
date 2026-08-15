import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClipFactory — โรงงานคลิปปักตะกร้า',
  description:
    'ป้อนลิงก์สินค้า ได้คลิป 9:16 พร้อมโพสต์หลายเวอร์ชัน สคริปต์และเสียงพากย์ไทยจาก Google AI Studio เรนเดอร์ mp4 ในเบราว์เซอร์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
