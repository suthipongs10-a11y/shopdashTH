/**
 * ศูนย์กลาง SEO ของเว็บ — meta + JSON-LD ทุกหน้าออกจากไฟล์นี้ที่เดียว
 *
 * หลักการ:
 *  1. ทุกหน้าปล่อย JSON-LD ก้อนเดียวแบบ `@graph` และผูกกันด้วย `@id`
 *     (สะอาดกว่าใส่หลาย <script> และช่วยให้ Google เข้าใจว่า entity เดียวกัน)
 *  2. canonical เป็น absolute URL + ปิดท้ายด้วย / เสมอ ตรงกับ trailingSlash ของ Astro
 *  3. ห้ามใส่ข้อมูลที่ไม่มีจริงลง schema (ที่อยู่ ดาว รีวิว) — ตัวสร้างจะข้ามให้เอง
 *     เมื่อข้อมูลใน data ยังว่าง
 */
import { business, contact, site, type District, type Faq, type Province, type Service } from '@/data/site';
import { aggregateFor, reviewsFor, type Review } from '@/data/reviews';

type Json = Record<string, unknown>;

/* ------------------------------------------------------------------ url */

export function abs(path: string): string {
  return new URL(path, site.url).href;
}

export const ID = {
  org: `${site.url}/#organization`,
  website: `${site.url}/#website`,
  page: (path: string) => `${abs(path)}#webpage`,
  breadcrumb: (path: string) => `${abs(path)}#breadcrumb`,
  service: (path: string) => `${abs(path)}#service`,
} as const;

/* --------------------------------------------------------------- meta */

export type Meta = {
  title: string;
  description: string;
  path: string;
};

/** ตัดคำอธิบายให้อยู่ในช่วงที่ Google แสดงได้ครบ (~155 ตัวอักษร) โดยไม่ตัดกลางคำ */
export function clampDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/* -------------------------------------------------------------- nodes */

function omitEmpty(obj: Json): Json {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

/** องค์กร = entity หลักของเว็บ ทุกหน้าอ้างถึงตัวนี้ */
export function orgNode(): Json {
  return omitEmpty({
    '@type': 'Organization',
    '@id': ID.org,
    name: site.name,
    legalName: business.legalName,
    url: site.url,
    description: site.description,
    telephone: contact.phoneTel,
    email: contact.email,
    // ใส่เฉพาะเมื่อมีที่อยู่จริง — ห้ามสร้างที่อยู่ปลอมให้ schema ครบ
    address: business.address
      ? { '@type': 'PostalAddress', addressCountry: 'TH', ...business.address }
      : undefined,
    sameAs: business.sameAs.length > 0 ? business.sameAs : undefined,
    logo: { '@type': 'ImageObject', url: abs('/og-default.png') },
  });
}

export function websiteNode(): Json {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: site.url,
    name: site.name,
    inLanguage: 'th-TH',
    publisher: { '@id': ID.org },
  };
}

export function webPageNode(meta: Meta, opts: { hasBreadcrumb?: boolean } = {}): Json {
  return omitEmpty({
    '@type': 'WebPage',
    '@id': ID.page(meta.path),
    url: abs(meta.path),
    name: meta.title,
    description: meta.description,
    inLanguage: 'th-TH',
    isPartOf: { '@id': ID.website },
    about: { '@id': ID.org },
    breadcrumb: opts.hasBreadcrumb ? { '@id': ID.breadcrumb(meta.path) } : undefined,
  });
}

export type Crumb = { name: string; path: string };

export function breadcrumbNode(path: string, crumbs: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    '@id': ID.breadcrumb(path),
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export function faqNode(path: string, faqs: Faq[]): Json | null {
  if (faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function reviewNodes(list: Review[]): Json[] {
  return list.map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    datePublished: r.date,
    reviewBody: r.body,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
  }));
}

/**
 * บริการในพื้นที่หนึ่ง ๆ
 *
 * ใช้ `Service` + `areaServed` แทนการประกาศ `LocalBusiness` แยกรายอำเภอ เพราะ
 * LocalBusiness ต้องมีที่ตั้งจริงต่อสาขา การประกาศ 6 สาขาที่ไม่มีอยู่จริง = spam
 * ผู้ให้บริการชี้กลับไปที่ Organization เดียว (ผูกด้วย @id)
 */
export function serviceNode(opts: {
  path: string;
  service: Service;
  province?: Province;
  district?: District;
}): Json {
  const { path, service, province, district } = opts;
  const areaServed = district
    ? [
        { '@type': 'AdministrativeArea', name: `อำเภอ${district.nameTh}` },
        ...district.areas.map((a) => ({ '@type': 'Place', name: `ตำบล${a}` })),
      ]
    : province
      ? [{ '@type': 'AdministrativeArea', name: `จังหวัด${province.nameTh}` }]
      : [{ '@type': 'AdministrativeArea', name: business.areaServedNote }];

  const scope = district
    ? { serviceSlug: service.slug, provinceSlug: province!.slug, districtSlug: district.slug }
    : province
      ? { serviceSlug: service.slug, provinceSlug: province.slug }
      : { serviceSlug: service.slug };

  const aggregate = aggregateFor(scope);
  const list = reviewsFor({ ...scope, limit: 10 });

  const name = district
    ? `${service.nameTh}${district.nameTh}`
    : province
      ? `${service.nameTh}${province.nameTh}`
      : service.nameTh;

  return omitEmpty({
    '@type': 'Service',
    '@id': ID.service(path),
    name,
    serviceType: service.nameTh,
    description: service.intro,
    provider: { '@id': ID.org },
    areaServed,
    availableChannel: {
      '@type': 'ServiceChannel',
      servicePhone: { '@type': 'ContactPoint', telephone: contact.phoneTel, contactType: 'จองคิว' },
      serviceUrl: abs(path),
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'THB',
      availability: 'https://schema.org/InStock',
      offers: service.priceTable.map((row) => ({
        '@type': 'Offer',
        name: row.type,
        description: `${row.type} ราคา ${row.price}`,
        priceCurrency: 'THB',
      })),
    },
    // ใส่เฉพาะเมื่อมีรีวิวจริงถึงเกณฑ์ (ดู src/data/reviews.ts)
    aggregateRating: aggregate
      ? {
          '@type': 'AggregateRating',
          ratingValue: aggregate.ratingValue,
          reviewCount: aggregate.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: list.length > 0 ? reviewNodes(list) : undefined,
  });
}

export function articleNode(opts: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
}): Json {
  return {
    '@type': 'Article',
    '@id': `${abs(opts.path)}#article`,
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    inLanguage: 'th-TH',
    author: { '@id': ID.org },
    publisher: { '@id': ID.org },
    mainEntityOfPage: { '@id': ID.page(opts.path) },
  };
}

/** รวมทุก node เป็น JSON-LD ก้อนเดียว */
export function graph(nodes: (Json | null)[]): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((n): n is Json => n !== null),
  };
}
