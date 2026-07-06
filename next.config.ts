import type { NextConfig } from "next";

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
};

export default nextConfig;
