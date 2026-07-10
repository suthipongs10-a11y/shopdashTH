import { notFound } from 'next/navigation';
import { publicR2Url } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';
import { DeleteProductButton } from '../delete-product-button';
import { ProductForm } from '../product-form';
import { ProductImages } from '../product-images';
import { ProductReviews, type ReviewRowData } from '../product-reviews';
import { VariantMatrix } from '../variant-matrix';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: images }, { data: variants }, { data: reviews }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id, name, description_md, category_id, base_price, status, is_featured')
        .eq('id', id)
        .eq('tenant_id', ctx.tenantId)
        .single(),
      supabase
        .from('categories')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_images')
        .select('id, r2_key')
        .eq('tenant_id', ctx.tenantId)
        .eq('product_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_variants')
        .select('id, size, color, sku, price_override, stock, low_stock_threshold, is_enabled')
        .eq('tenant_id', ctx.tenantId)
        .eq('product_id', id)
        .order('size', { ascending: true })
        .order('color', { ascending: true }),
      supabase
        .from('product_reviews')
        .select('id, rating, author_name, comment, is_published, created_at')
        .eq('tenant_id', ctx.tenantId)
        .eq('product_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!product) notFound();

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">แก้ไขสินค้า</h1>
        <DeleteProductButton productId={product.id} name={product.name} />
      </div>

      <ProductForm categories={categories ?? []} product={product} />

      <section className="max-w-xl space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">รูปสินค้า</h2>
        <ProductImages
          productId={product.id}
          images={(images ?? []).map((img) => ({ id: img.id, publicUrl: publicR2Url(img.r2_key) }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">ไซส์ / สี (Variant)</h2>
        <VariantMatrix productId={product.id} variants={variants ?? []} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">รีวิวสินค้า</h2>
        <ProductReviews productId={product.id} reviews={(reviews ?? []) as ReviewRowData[]} />
      </section>
    </div>
  );
}
