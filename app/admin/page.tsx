import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Phase 5 จะมีแดชบอร์ดจริง — ตอนนี้พาไปหน้าสินค้าเป็นหน้าแรกหลัง login
export default async function AdminIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/admin/products' : '/admin/login');
}
