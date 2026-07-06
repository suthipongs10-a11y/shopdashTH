import Link from 'next/link';
import { formatBaht } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

const STATUS_TH: Record<string, string> = {
  draft: 'ฉบับร่าง',
  published: 'เผยแพร่',
  hidden: 'ซ่อน',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  hidden: 'bg-yellow-100 text-yellow-700',
};

export default async function ProductsPage() {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, base_price, status, is_featured, categories(name)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  const list = products ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">สินค้า</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + เพิ่มสินค้าใหม่
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {list.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            ยังไม่มีสินค้า — เริ่มเพิ่มสินค้าชิ้นแรกของคุณ
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">ชื่อสินค้า</th>
                <th className="px-4 py-2 font-medium">หมวดหมู่</th>
                <th className="px-4 py-2 font-medium">ราคาตั้งต้น</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.is_featured && (
                      <span className="ml-2 rounded-sm bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        แนะนำ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(product.categories as unknown as { name: string } | null)?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{formatBaht(product.base_price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[product.status]}`}
                    >
                      {STATUS_TH[product.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
