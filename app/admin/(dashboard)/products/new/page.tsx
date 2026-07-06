import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">เพิ่มสินค้าใหม่</h1>
      <ProductForm categories={categories ?? []} />
    </div>
  );
}
