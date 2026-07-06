import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardVariant } from '@/themes/types';
import { formatBahtRange } from '@/lib/format';
import type { ProductCardData } from './types';

function CardImage({ product }: { product: ProductCardData }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-surface">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-text-muted">
          ไม่มีรูปสินค้า
        </div>
      )}
      {product.badge && (
        <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-primary-fg">
          {product.badge}
        </span>
      )}
      {!product.inStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-scrim">
          <span className="rounded-sm bg-bg px-3 py-1 text-sm font-medium text-text">
            สินค้าหมด
          </span>
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  variant = 'minimal',
}: {
  product: ProductCardData;
  variant?: ProductCardVariant;
}) {
  const price = (
    <span className="font-medium">{formatBahtRange(product.priceMin, product.priceMax)}</span>
  );

  if (variant === 'overlay') {
    return (
      <Link href={product.href} className="group relative block overflow-hidden rounded-md">
        <CardImage product={product} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim to-transparent p-3 pt-10">
          <p className="truncate text-sm font-medium text-primary-fg">{product.name}</p>
          <p className="text-sm text-primary-fg">
            {formatBahtRange(product.priceMin, product.priceMax)}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === 'bordered') {
    return (
      <Link
        href={product.href}
        className="group block overflow-hidden rounded-md border border-border bg-bg shadow-card"
      >
        <CardImage product={product} />
        <div className="p-3">
          <p className="truncate text-sm">{product.name}</p>
          <p className="mt-1 text-sm">{price}</p>
        </div>
      </Link>
    );
  }

  // minimal (ดีฟอลต์กลุ่ม Basic)
  return (
    <Link href={product.href} className="group block">
      <div className="overflow-hidden rounded-md">
        <CardImage product={product} />
      </div>
      <div className="mt-2">
        <p className="truncate text-sm">{product.name}</p>
        <p className="mt-0.5 text-sm">{price}</p>
      </div>
    </Link>
  );
}
