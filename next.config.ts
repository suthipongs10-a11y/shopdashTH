import type { NextConfig } from "next";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "shopdashth.com";

// อนุญาต next/image โหลดรูปจาก R2 public bucket domain (§3.9)
function r2RemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    return [{ protocol: "https", hostname: new URL(base).hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2RemotePatterns(),
  },
  experimental: {
    // Server Actions มีระบบกัน CSRF ที่เทียบ Origin กับ Host — แต่ traffic ร้านวิ่งผ่าน
    // Cloudflare Worker → Vercel เห็น Host เป็น *.vercel.app (ไม่ตรง Origin โดเมนร้าน) จะถูกบล็อก
    // whitelist โดเมนแพลตฟอร์ม + subdomain ร้านทุกร้าน (ดู middleware.ts / DEPLOYMENT.md §1.1)
    serverActions: {
      allowedOrigins: [ROOT_DOMAIN, `*.${ROOT_DOMAIN}`],
    },
  },
};

export default nextConfig;
