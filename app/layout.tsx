import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopDash",
  description: "แพลตฟอร์มร้านค้าออนไลน์สำหรับร้านค้าไทย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
