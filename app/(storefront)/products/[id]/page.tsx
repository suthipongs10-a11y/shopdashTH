// หน้าสินค้า — แกลเลอรีรูปซ้าย รายละเอียดขวา (wireframe กลุ่ม Basic §4.6)
// P4: WishlistButton + RelatedProducts เปิดตาม feature flag ของธีม/แพลน (§3.7)

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RelatedProducts } from '@/components/storefront/RelatedProducts';
import { WishlistButton } from '@/components/storefront/WishlistButton';
import { QrIcon, ShieldIcon, TruckIcon } from '@/components/storefront/icons';
import { fetchProduct, fetchRelated } from '@/lib/catalog';
import { getTenantContext } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';
import { ImageGallery } from './image-gallery';
import { VariantSelector } from './variant-selector';

// cache ต่อ request — generateMetadata กับ page ใช้ผลเดียวกัน ไม่ query ซ้ำ
const getProduct = cache((tenantId: string, id: string) => fetchProduct(tenantId, id));

// SEO ต่อสินค้า (§5.5) — ชื่อสินค้า + รูปแรกเป็น OG (title ต่อท้ายด้วยชื่อร้านจาก template)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const ctx = await getTenantContext();
    const product = await getProduct(ctx.tenantId, id);
    if (!product) return { title: 'ไม่พบสินค้า' };
    return {
      title: product.name,
      description: product.descriptionMd?.slice(0, 160) ?? `${product.name} — ${ctx.store.name}`,
      openGraph: {
        title: product.name,
        images: product.images[0] ? [product.images[0]] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const product = await getProduct(ctx.tenantId, id);
  if (!product) notFound();

  const preset = getPreset(ctx.store.theme_code);
  const related = ctx.features.related_products
    ? await fetchRelated(ctx.tenantId, product.id, product.categoryId)
    : [];

  return (
    <main className="mx-auto max-w-(--container-max) px-4 py-8">
      {/* breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-text-muted">
        <Link href="/" className="transition-colors hover:text-primary">
          หน้าแรก
        </Link>
        <span aria-hidden>/</span>
        <Link href="/products" className="transition-colors hover:text-primary">
          สินค้าทั้งหมด
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-text">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} productName={product.name} />

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{product.name}</h1>
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

          {/* จุดขายความมั่นใจ — ชำระ/ตรวจสอบ/จัดส่ง */}
          <ul className="grid gap-2 rounded-lg border border-border-soft bg-surface p-4 text-sm text-text-muted sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <QrIcon size={16} className="shrink-0 text-primary" />
              สแกนจ่าย PromptPay
            </li>
            <li className="flex items-center gap-2 whitespace-nowrap">
              <ShieldIcon size={16} className="shrink-0 text-primary" />
              ตรวจสลิปทุกออร์เดอร์
            </li>
            <li className="flex items-center gap-2">
              <TruckIcon size={16} className="shrink-0 text-primary" />
              มีเลขพัสดุติดตาม
            </li>
          </ul>

          {product.descriptionMd && (
            <div className="rounded-lg border border-border-soft p-5">
              <h2 className="mb-2 font-heading text-base font-semibold">รายละเอียดสินค้า</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
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
