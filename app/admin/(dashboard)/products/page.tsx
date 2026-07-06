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

interface LowStockRow {
  stock: number;
  low_stock_threshold: number;
  size: string | null;
  color: string | null;
  products: { name: string };
}

export default async function ProductsPage() {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const [{ data: products }, { data: lowStockData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, base_price, status, is_featured, categories(name)')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('product_variants')
      .select('stock, low_stock_threshold, size, color, products!inner(name, status)')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_enabled', true)
      .neq('products.status', 'draft'),
  ]);

  const list = products ?? [];
  // แถบเตือนสต๊อกใกล้หมด (§2.3): variant ที่ stock ต่ำกว่า threshold ของตัวเอง
  const lowStock = ((lowStockData ?? []) as unknown as LowStockRow[]).filter(
    (v) => v.stock <= v.low_stock_threshold,
  );

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <p className="font-medium">⚠ สินค้าใกล้หมดสต๊อก {lowStock.length} รายการ</p>
          <ul className="mt-1 list-disc pl-5">
            {lowStock.slice(0, 5).map((v, i) => (
              <li key={i}>
                {v.products.name}
                {(v.size || v.color) && ` (${[v.size, v.color].filter(Boolean).join(' / ')})`} —
                เหลือ {v.stock} ชิ้น
              </li>
            ))}
            {lowStock.length > 5 && <li>และอีก {lowStock.length - 5} รายการ…</li>}
          </ul>
        </div>
      )}
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
