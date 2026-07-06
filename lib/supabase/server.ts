import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client สำหรับ Server Components / Route Handlers / Server Actions
 * ใช้ anon key + session cookie ของ user — สิทธิ์ถูกคุมด้วย RLS ตาม JWT
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component ที่เขียน cookie ไม่ได้ — ปล่อยผ่าน
            // (session refresh จะถูกจัดการโดย middleware ใน Phase 2)
          }
        },
      },
    },
  );
}
