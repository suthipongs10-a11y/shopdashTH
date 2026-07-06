import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client สำหรับ Client Components (browser)
 * ใช้ anon key เท่านั้น — สิทธิ์ถูกคุมด้วย RLS
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
