import Image from 'next/image';
import Link from 'next/link';
import { AlertIcon, PlusIcon, ProductsIcon, StarIcon } from '@/components/admin/icons';
import {
  Badge,
  btnPrimary,
  EmptyState,
  PageHeader,
  tableWrap,
  tdClass,
  thClass,
  trHover,
  type BadgeTone,
} from '@/components/admin/ui';
import { formatBaht } from '@/lib/format';
import { publicR2Url } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

const STATUS_TH: Record<string, string> = {
  draft: 'ฉบับร่าง',
  published: 'เผยแพร่',
  hidden: 'ซ่อน',
};

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  hidden: 'warning',
};

interface LowStockRow {
  stock: number;
  low_stock_threshold: number;
  size: string | null;
  color: string | null;
  products: { name: string };
}

interface ProductRow {
  id: string;
  name: string;
  base_price: number;
  status: string;
  is_featured: boolean;
  categories: { name: string } | null;
  product_images: { r2_key: string; sort_order: number }[];
}

export default async function ProductsPage() {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const [{ data: products }, { data: lowStockData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, base_price, status, is_featured, categories(name), product_images(r2_key, sort_order)')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('product_variants')
      .select('stock, low_stock_threshold, size, color, products!inner(name, status)')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_enabled', true)
      .neq('products.status', 'draft'),
  ]);

  const list = (products ?? []) as unknown as ProductRow[];
  // แถบเตือนสต๊อกใกล้หมด (§2.3): variant ที่ stock ต่ำกว่า threshold ของตัวเอง
  const lowStock = ((lowStockData ?? []) as unknown as LowStockRow[]).filter(
    (v) => v.stock <= v.low_stock_threshold,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="สินค้า"
        description={`ทั้งหมด ${list.length.toLocaleString('th-TH')} รายการ`}
        actions={
          <Link href="/admin/products/new" className={btnPrimary}>
            <PlusIcon size={15} />
            เพิ่มสินค้าใหม่
          </Link>
        }
      />

      {lowStock.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
          <AlertIcon size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">สินค้าใกล้หมดสต๊อก {lowStock.length} รายการ</p>
            <ul className="mt-1 space-y-0.5 text-amber-700">
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
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<ProductsIcon size={22} />}
          title="ยังไม่มีสินค้า"
          sub="เริ่มเพิ่มสินค้าชิ้นแรกของร้านคุณ พร้อมรูปภาพและตัวเลือกสินค้า (เช่น ไซส์/สี)"
          action={
            <Link href="/admin/products/new" className={btnPrimary}>
              <PlusIcon size={15} />
              เพิ่มสินค้าใหม่
            </Link>
          }
        />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thClass}>สินค้า</th>
                <th className={thClass}>หมวดหมู่</th>
                <th className={`${thClass} text-right`}>ราคาตั้งต้น</th>
                <th className={thClass}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((product) => {
                const cover = [...(product.product_images ?? [])].sort(
                  (a, b) => a.sort_order - b.sort_order,
                )[0];
                return (
                  <tr key={product.id} className={trHover}>
                    <td className={tdClass}>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                          {cover ? (
                            <Image
                              src={publicR2Url(cover.r2_key)}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-gray-300">
                              <ProductsIcon size={18} />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900 group-hover:text-indigo-600">
                            {product.name}
                          </span>
                          {product.is_featured && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                              <StarIcon size={11} />
                              สินค้าแนะนำ
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdClass} text-gray-500`}>
                      {product.categories?.name ?? '-'}
                    </td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900`}>
                      {formatBaht(product.base_price)}
                    </td>
                    <td className={tdClass}>
                      <Badge tone={STATUS_TONE[product.status]}>{STATUS_TH[product.status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
