import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';
import { CategoryRow } from './category-row';
import { NewCategoryForm } from './new-category-form';

export default async function CategoriesPage() {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: true });

  const list = categories ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">หมวดหมู่สินค้า</h1>
      <NewCategoryForm />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">ยังไม่มีหมวดหมู่</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {list.map((category, i) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                name={category.name}
                isFirst={i === 0}
                isLast={i === list.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
