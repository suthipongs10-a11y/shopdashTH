// หน้าสินค้า — แกลเลอรีรูปซ้าย รายละเอียดขวา (wireframe กลุ่ม Basic §4.6)
// P4: WishlistButton + RelatedProducts เปิดตาม feature flag ของธีม/แพลน (§3.7)

import { notFound } from 'next/navigation';
import { RelatedProducts } from '@/components/storefront/RelatedProducts';
import { WishlistButton } from '@/components/storefront/WishlistButton';
import { fetchProduct, fetchRelated } from '@/lib/catalog';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { ImageGallery } from './image-gallery';
import { VariantSelector } from './variant-selector';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const product = await fetchProduct(ctx.tenantId, id);
  if (!product) notFound();

  const preset = getPreset(ctx.store.theme_code);
  const related = ctx.features.related_products
    ? await fetchRelated(ctx.tenantId, product.id, product.categoryId)
    : [];

  return (
    <main className="mx-auto max-w-(--container-max) px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <ImageGallery images={product.images} productName={product.name} />

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-2xl font-semibold">{product.name}</h1>
            <WishlistButton
              productId={product.id}
              enabled={ctx.features.wishlist}
              storageKey={`shopdash_wishlist_${ctx.slug}`}
            />
          </div>

          <VariantSelector
            slug={ctx.slug}
            productId={product.id}
            productName={product.name}
            imageUrl={product.images[0]}
            variants={product.variants}
          />

          {product.descriptionMd && (
            <div className="border-t border-border pt-5">
              <h2 className="mb-2 text-sm font-medium text-text-muted">รายละเอียดสินค้า</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {product.descriptionMd}
              </p>
            </div>
          )}
        </div>
      </div>

      <RelatedProducts
        products={related}
        enabled={ctx.features.related_products}
        cardVariant={preset.variants.productCard}
      />
    </main>
  );
}
