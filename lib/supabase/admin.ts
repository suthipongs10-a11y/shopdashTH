import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — service role key, ข้าม RLS ทั้งหมด
 * ใช้เฉพาะใน Route Handlers ฝั่ง server (checkout, slips, signup ฯลฯ)
 * ห้าม import จาก Client Component เด็ดขาด (`server-only` จะ throw ตอน build)
 * ผู้เรียกต้อง scope tenant เองเสมอผ่าน getTenantContext()
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
