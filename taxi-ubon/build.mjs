// Zero-dependency static site generator for แท็กซี่อุบล.com (Cloudflare Pages).
// Usage: node build.mjs   → writes ./dist
import { mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from './site.config.mjs';
import { pages } from './content/pages.mjs';
const images = JSON.parse(readFileSync(new URL('./content/images.json', import.meta.url), 'utf8'));

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
const today = new Date().toISOString().slice(0, 10);

// ───────── helpers ─────────
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const path = (slug) => (slug ? `/${encodeURIComponent(slug)}/` : '/');
const abs = (slug) => site.origin + path(slug);
const bySlug = new Map(pages.map((p) => [p.slug, p]));

// Short labels for nav/link cards.
const shortName = (p) =>
  ({ '': 'หน้าแรก', about: 'เกี่ยวกับเรา', contact: 'ติดต่อเรา' })[p.slug] ?? p.slug.replace(/-/g, ' – ');

// ───────── photos (pre-optimized by scripts/optimize-images.mjs) ─────────
const photos = {
  'taxi-at-home': 'แท็กซี่อุบลคนบ้านเฮา รถโตโยต้าสีแดง-เหลือง จอดรับผู้โดยสารถึงหน้าบ้าน',
  'driver-luggage-1': 'คนขับแท็กซี่อุบลช่วยยกกระเป๋าเดินทางให้ผู้โดยสาร',
  'driver-luggage-2': 'คนขับแท็กซี่รับผู้โดยสารพร้อมกระเป๋าหน้าบ้าน ก่อนไปสนามบินอุบล',
  'driver-with-customer': 'คนขับแท็กซี่อุบลกับลูกค้าชาวต่างชาติ',
  'taxi-side': 'รถแท็กซี่อุบลคนบ้านเฮา ทะเบียน ทข-571 อบ.',
};
// Default photo per page group; a page can override with `image`.
const groupPhoto = { airport: 'driver-luggage-2', province: 'taxi-side', district: 'taxi-at-home', service: 'driver-luggage-1', core: 'taxi-at-home' };

function img(name, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const m = images[name];
  if (!m) throw new Error(`unknown photo: ${name}`);
  const largest = m.widths[m.widths.length - 1];
  const srcset = m.widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
  return `<img${cls ? ` class="${cls}"` : ''} src="/img/${name}-${m.widths[0]}.webp" srcset="${srcset}" sizes="${sizes}" width="${largest}" height="${Math.round((m.height * largest) / m.width)}" alt="${esc(photos[name])}"${
    eager ? ' fetchpriority="high"' : ' loading="lazy"'
  } decoding="async">`;
}

// Photo + caption band shown on inner pages.
function photoBand(p) {
  const main = p.image ?? groupPhoto[p.group];
  const second = main === 'driver-with-customer' ? 'driver-luggage-1' : 'driver-with-customer';
  return `<section class="photo-band">
    <figure class="pb-main">${img(main, { sizes: '(min-width:960px) 560px, 100vw' })}<figcaption>${esc(photos[main])}</figcaption></figure>
    <div class="pb-side">
      <figure>${img(second, { sizes: '(min-width:960px) 280px, 50vw' })}</figure>
      <div class="pb-quote"><b>${esc(site.tagline)}</b><span>คนขับท้องถิ่นอุบลฯ ประสบการณ์ ${site.yearsExperience}+ ปี ช่วยยกกระเป๋า รับถึงหน้าบ้าน</span></div>
    </div>
  </section>`;
}

function gallery() {
  const items = ['driver-luggage-1', 'driver-with-customer', 'taxi-side', 'driver-luggage-2'];
  return `<section class="block"><h2>ภาพบริการจริงจากลูกค้าของเรา</h2>
    <div class="gallery">${items
      .map((n, i) => `<figure class="g${i + 1}">${img(n, { sizes: '(min-width:960px) 300px, 50vw' })}<figcaption>${esc(photos[n])}</figcaption></figure>`)
      .join('')}</div></section>`;
}

// Cache-busted CSS file name.
const css = readFileSync(join(root, 'static/assets/site.css'), 'utf8');
const cssHash = createHash('sha256').update(css).digest('hex').slice(0, 10);
const cssHref = `/assets/site.${cssHash}.css`;

// ───────── icons (inline SVG, stroke = currentColor) ─────────
const icon = (name) => {
  const d = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    road: '<path d="M4 19 8 5M20 19 16 5M12 6v2M12 11v2M12 16v2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    car: '<path d="M19 17h2v-5l-2-5H5L3 12v5h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6M3 12h18"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  }[name];
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
};
const groupIcon = { airport: 'plane', province: 'road', district: 'pin', service: 'star', core: 'car' };

// ───────── shared chunks ─────────
const telHref = `tel:${site.phoneE164}`;
const ctaButtons = (big = false) => `
  <div class="cta-row${big ? ' cta-big' : ''}">
    <a class="btn btn-primary" href="${telHref}">${icon('phone')}<span>โทร ${site.phone}</span></a>
    <a class="btn btn-line" href="${site.lineUrl}" rel="nofollow noopener" target="_blank">${icon('chat')}<span>แอด LINE</span></a>
  </div>`;

const navGroups = [
  ['airport', 'สนามบิน / สถานี'],
  ['province', 'เหมารถต่างจังหวัด'],
  ['district', 'อำเภอในอุบลฯ'],
  ['service', 'บริการอื่นๆ'],
];
const inGroup = (g) => pages.filter((p) => p.group === g);

function header(current) {
  const links = [
    ['แท็กซี่สนามบินอุบล', 'สนามบิน'],
    ['เหมารถต่างจังหวัด', 'ต่างจังหวัด'],
    ['เหมาแท็กซี่เที่ยวอุบล', 'เที่ยวอุบล'],
    ['ราคาแท็กซี่อุบล', 'ราคา'],
    ['contact', 'ติดต่อ'],
  ];
  const nav = links
    .map(([s, t]) => `<a href="${path(s)}"${s === current ? ' aria-current="page"' : ''}>${t}</a>`)
    .join('');
  return `
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="${esc(site.name)} หน้าแรก">
      <span class="brand-mark" aria-hidden="true">TAXI</span>
      <span class="brand-text"><b>${esc(site.shortName)}</b><small>คนบ้านเฮา · 24 ชม.</small></span>
    </a>
    <nav class="nav-desktop" aria-label="เมนูหลัก">${nav}</nav>
    <a class="btn btn-primary btn-sm hide-sm" href="${telHref}">${icon('phone')}<span>${site.phone}</span></a>
    <details class="nav-mobile">
      <summary aria-label="เปิดเมนู">${icon('menu')}</summary>
      <nav aria-label="เมนูมือถือ">${nav}<a href="${path('about')}">เกี่ยวกับเรา</a></nav>
    </details>
  </div>
</header>`;
}

function footer() {
  const cols = navGroups
    .map(
      ([g, t]) =>
        `<div><h3>${t}</h3><ul>${inGroup(g)
          .map((p) => `<li><a href="${path(p.slug)}">${esc(shortName(p))}</a></li>`)
          .join('')}</ul></div>`,
    )
    .join('');
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <p class="brand-text"><b>${esc(site.name)}</b></p>
        <p>${esc(site.tagline)}</p>
        <p>${esc(site.address.street)} ${esc(site.address.locality)} จ.${esc(site.address.region)} ${esc(site.address.postalCode)}</p>
        <p><a href="${telHref}">โทร ${site.phone}</a> · LINE: <a href="${site.lineUrl}" rel="nofollow noopener" target="_blank">${site.lineId}</a></p>
        <p>เปิดบริการ ${esc(site.openingHours)}</p>
      </div>
      <div class="foot-links">${cols}</div>
    </div>
    <p class="copy">© ${new Date().getFullYear()} ${esc(site.displayDomain)} · <a href="/about/">เกี่ยวกับเรา</a> · <a href="/contact/">ติดต่อเรา</a></p>
  </div>
</footer>
<div class="sticky-cta" role="region" aria-label="ติดต่อด่วน">
  <a class="btn btn-primary" href="${telHref}">${icon('phone')}<span>โทรเรียกรถ</span></a>
  <a class="btn btn-line" href="${site.lineUrl}" rel="nofollow noopener" target="_blank">${icon('chat')}<span>LINE</span></a>
</div>`;
}

// ───────── structured data ─────────
const businessId = `${site.origin}/#business`;
const businessLd = {
  '@type': ['LocalBusiness', 'TaxiService'],
  '@id': businessId,
  name: site.name,
  url: site.origin + '/',
  telephone: site.phoneE164,
  image: [`${site.origin}/og.png`, ...['taxi-at-home', 'taxi-side', 'driver-with-customer'].map((n) => `${site.origin}/img/${n}-${images[n].widths.at(-1)}.webp`)],
  priceRange: '฿฿',
  slogan: site.tagline,
  address: {
    '@type': 'PostalAddress',
    streetAddress: `${site.address.street} ${site.address.locality}`,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: 'TH',
  },
  geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
  areaServed: { '@type': 'AdministrativeArea', name: 'จังหวัดอุบลราชธานี' },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
  sameAs: [site.lineUrl],
};

function jsonLd(p, crumbs) {
  const graph = [];
  if (p.slug === '' || p.slug === 'contact' || p.slug === 'about') graph.push(businessLd);
  else
    graph.push({
      '@type': 'TaxiService',
      name: p.h1,
      description: p.description,
      url: abs(p.slug),
      provider: { '@id': businessId, '@type': 'LocalBusiness', name: site.name, telephone: site.phoneE164 },
      areaServed: p.facts?.to ?? 'อุบลราชธานี',
    });
  if (crumbs.length > 1)
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(([name, slug], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(slug) })),
    });
  if (p.faqs?.length)
    graph.push({
      '@type': 'FAQPage',
      mainEntity: p.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

// ───────── page sections ─────────
function factsCard(f) {
  if (!f) return '';
  const rows = [
    ['ต้นทาง', f.from],
    ['ปลายทาง', f.to],
    ['ระยะทาง', f.distance],
    ['เวลาเดินทาง', f.duration],
    ['เส้นทาง', f.road],
  ].filter(([, v]) => v);
  return `<aside class="facts" aria-label="ข้อมูลการเดินทาง">
    <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <p class="muted small">* ระยะทางและเวลาโดยประมาณ ขึ้นกับจุดรับส่งและสภาพจราจร</p>
  </aside>`;
}

function section(s) {
  let body = (s.paras ?? []).map((t) => `<p>${esc(t)}</p>`).join('');
  if (s.list) body += `<ul class="checks">${s.list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  if (s.table) body += table(s.table);
  return `<section class="block"><h2>${esc(s.h2)}</h2>${body}</section>`;
}

function table([head, ...rows]) {
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function distanceTable() {
  const rows = pages
    .filter((p) => p.facts?.to)
    .map((p) => [`<a href="${path(p.slug)}">${esc(p.facts.to)}</a>`, p.facts.distance.replace('ประมาณ ', ''), p.facts.duration.replace('ประมาณ ', ''), 'สอบถามราคา']);
  return `<section class="block"><h2>ระยะทางจากตัวเมืองอุบลฯ</h2>${table([['ปลายทาง', 'ระยะทางประมาณ', 'เวลาประมาณ', 'ราคา'], ...rows])}</section>`;
}

function faqBlock(faqs) {
  if (!faqs?.length) return '';
  return `<section class="block"><h2>คำถามที่พบบ่อย</h2><div class="faq">${faqs
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
    .join('')}</div></section>`;
}

function linkCard(p) {
  return `<a class="card link-card" href="${path(p.slug)}">
    <span class="card-icon">${icon(groupIcon[p.group])}</span>
    <span><b>${esc(shortName(p))}</b><small>${esc(p.facts?.distance ?? p.description.slice(0, 48) + '…')}</small></span>
    ${icon('arrow')}
  </a>`;
}

function related(p) {
  const list = (p.related ?? []).map((s) => bySlug.get(s)).filter(Boolean);
  if (!list.length) return '';
  return `<section class="block"><h2>บริการที่เกี่ยวข้อง</h2><div class="grid grid-3">${list.map(linkCard).join('')}</div></section>`;
}

function hubList(p) {
  if (!p.hub) return '';
  const list = inGroup(p.hub).filter((x) => x.slug !== p.slug);
  return `<section class="block"><h2>เส้นทางต่างจังหวัดยอดนิยม</h2><div class="grid grid-3">${list.map(linkCard).join('')}</div></section>`;
}

function ctaBand() {
  return `<section class="cta-band"><div class="wrap">
    <h2>พร้อมเดินทางแล้วใช่ไหม</h2>
    <p>โทรหรือทัก LINE แจ้งต้นทาง–ปลายทาง รับราคาทันที บริการ 24 ชั่วโมง</p>
    ${ctaButtons(true)}
  </div></section>`;
}

// ───────── layout ─────────
function layout(p, main, crumbs) {
  const url = abs(p.slug);
  const crumbHtml =
    crumbs.length > 1
      ? `<nav class="crumbs wrap" aria-label="เส้นทางหน้า"><ol>${crumbs
          .map(([n, s], i) => (i < crumbs.length - 1 ? `<li><a href="${path(s)}">${esc(n)}</a></li>` : `<li aria-current="page">${esc(n)}</li>`))
          .join('')}</ol></nav>`
      : '';
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0f1b2d">
<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.origin}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/anuphan-thai-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/kanit-thai-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${cssHref}">${p.slug === '' ? `\n<link rel="preload" as="image" href="/img/taxi-at-home-480.webp" imagesrcset="/img/taxi-at-home-480.webp 480w, /img/taxi-at-home-765.webp 765w" imagesizes="(min-width:900px) 420px, 100vw" fetchpriority="high">` : ''}
${jsonLd(p, crumbs)}
</head>
<body>
<a class="skip" href="#main">ข้ามไปเนื้อหา</a>
${header(p.slug)}
${crumbHtml}
<main id="main">${main}</main>
${ctaBand()}
${footer()}
</body>
</html>`;
}

// ───────── page renderers ─────────
function renderPage(p) {
  const crumbs = [['หน้าแรก', '']];
  if (p.group === 'province' && p.slug !== 'เหมารถต่างจังหวัด') crumbs.push(['เหมารถต่างจังหวัด', 'เหมารถต่างจังหวัด']);
  crumbs.push([shortName(p), p.slug]);

  const main = `
<section class="hero hero-sub"><div class="wrap hero-grid">
  <div>
    <p class="eyebrow">${icon(groupIcon[p.group])} ${esc(site.name)} · 24 ชม.</p>
    <h1>${esc(p.h1)}</h1>
    <p class="lead">${esc(p.lead)}</p>
    ${ctaButtons()}
  </div>
  ${factsCard(p.facts) || trustCard()}
</div></section>
<div class="wrap content">
  ${(p.sections ?? []).slice(0, 1).map(section).join('')}
  ${photoBand(p)}
  ${(p.sections ?? []).slice(1).map(section).join('')}
  ${p.slug === 'about' ? gallery() : ''}
  ${p.distanceTable ? distanceTable() : ''}
  ${hubList(p)}
  ${p.slug === 'contact' ? contactBlock() : ''}
  ${faqBlock(p.faqs)}
  ${related(p)}
</div>`;
  return layout(p, main, crumbs);
}

function trustCard() {
  return `<aside class="facts trust" aria-label="จุดเด่น">
    <ul>
      <li>${icon('clock')}<span><b>24 ชั่วโมง</b> ทุกวัน รวมวันหยุด</span></li>
      <li>${icon('shield')}<span><b>${site.yearsExperience}+ ปี</b> คนขับท้องถิ่นอุบลฯ</span></li>
      <li>${icon('tag')}<span><b>ราคาตกลงก่อน</b> ไม่บวกเพิ่มกลางทาง</span></li>
    </ul>
  </aside>`;
}

function contactBlock() {
  return `<section class="block"><h2>ช่องทางติดต่อ</h2><div class="grid grid-3">
    <a class="card contact-card" href="${telHref}">${icon('phone')}<b>โทรศัพท์</b><span>${site.phone}</span></a>
    <a class="card contact-card" href="${site.lineUrl}" rel="nofollow noopener" target="_blank">${icon('chat')}<b>LINE</b><span>${site.lineId}</span></a>
    <div class="card contact-card">${icon('pin')}<b>ที่อยู่</b><span>${esc(site.address.street)} ${esc(site.address.locality)} จ.${esc(site.address.region)} ${esc(site.address.postalCode)}</span></div>
  </div></section>`;
}

function renderHome(p) {
  const why = [
    ['clock', 'พร้อมทุกเวลา', 'เรียกได้ 24 ชั่วโมง ทั้งเที่ยวบินดึก รถไฟเช้ามืด และรถทัวร์ตีห้า'],
    ['shield', `ประสบการณ์ ${site.yearsExperience}+ ปี`, 'คนขับเป็นคนอุบลฯ รู้ทาง รู้จุดรับส่ง ขับสุภาพ ปลอดภัย'],
    ['tag', 'ราคาชัดเจน', 'แจ้งราคาเหมาก่อนออกรถ ไม่มีค่าใช้จ่ายแอบแฝง'],
    ['car', 'รถสะอาด แอร์เย็น', 'ดูแลรถทุกวัน นั่งสบายทั้งระยะใกล้และระยะไกล'],
  ];
  const steps = ['โทรหรือทัก LINE แจ้งจุดรับ–ปลายทาง', 'รับราคาและยืนยันเวลา', 'คนขับไปรับถึงที่ ตรงเวลา'];
  const main = `
<section class="hero"><div class="wrap hero-grid">
  <div>
    <p class="eyebrow">${icon('star')} ${esc(site.name)}</p>
    <h1>${esc(p.h1)}<span>รับส่งสนามบิน · เหมารถต่างจังหวัด</span></h1>
    <p class="lead">${esc(p.lead)}</p>
    ${ctaButtons(true)}
    <ul class="pills" aria-label="จุดเด่น"><li>24 ชม.</li><li>${site.yearsExperience}+ ปี</li><li>ทุกอำเภอ</li><li>ทั่วไทย</li></ul>
  </div>
  <figure class="hero-photo">
    ${img('taxi-at-home', { sizes: '(min-width:900px) 420px, 100vw', eager: true })}
    <figcaption class="badge badge-top">${icon('clock')}<span><b>24 ชม.</b> ทุกวัน</span></figcaption>
    <div class="badge badge-bottom">${icon('shield')}<span><b>${site.yearsExperience}+ ปี</b> คนขับท้องถิ่น</span></div>
  </figure>
</div></section>

<div class="wrap content">
  <section class="block">
    <h2>บริการยอดนิยม</h2>
    <div class="grid grid-3 feature-grid">
      ${['แท็กซี่สนามบินอุบล', 'เหมารถต่างจังหวัด', 'แท็กซี่สถานีรถไฟอุบล', 'รถไปสนามบินอุบลราชธานี', 'เหมาแท็กซี่เที่ยวอุบล', 'แท็กซี่บขสอุบล']
        .map((s) => bySlug.get(s))
        .map(
          (x) => `<a class="card feature" href="${path(x.slug)}">
        <span class="card-icon">${icon(groupIcon[x.group])}</span>
        <h3>${esc(x.h1)}</h3><p>${esc(x.description.slice(0, 90))}…</p>
        <span class="more">ดูรายละเอียด ${icon('arrow')}</span></a>`,
        )
        .join('')}
    </div>
  </section>

  <section class="block">
    <h2>ทำไมต้องเรียกแท็กซี่อุบลคนบ้านเฮา</h2>
    <div class="grid grid-4">${why
      .map(([i, t, d]) => `<div class="card why"><span class="card-icon">${icon(i)}</span><h3>${t}</h3><p>${d}</p></div>`)
      .join('')}</div>
  </section>

  ${gallery()}

  <section class="block">
    <h2>เหมารถต่างจังหวัด จากอุบลราชธานี</h2>
    <p>รถรับจ้างต่างจังหวัด รับหน้าบ้าน ส่งถึงปลายทาง ราคาตกลงก่อนเดินทาง</p>
    <div class="grid grid-3">${inGroup('province').filter((x) => x.slug !== 'เหมารถต่างจังหวัด').map(linkCard).join('')}</div>
  </section>

  <section class="block">
    <h2>แท็กซี่ทุกอำเภอในอุบลราชธานี</h2>
    <div class="grid grid-3">${inGroup('district').map(linkCard).join('')}</div>
  </section>

  <section class="block">
    <h2>เรียกรถง่ายใน 3 ขั้นตอน</h2>
    <ol class="steps">${steps.map((s, i) => `<li><span>${i + 1}</span>${s}</li>`).join('')}</ol>
  </section>

  <section class="block">
    <h2>บริการพิเศษ</h2>
    <div class="grid grid-3">${['แท็กซี่รับส่งสัตว์เลี้ยงอุบล', 'แท็กซี่ส่งของด่วนอุบล', 'แท็กซี่ขนย้ายหอพักอุบล'].map((s) => linkCard(bySlug.get(s))).join('')}</div>
  </section>

  ${faqBlock(homeFaqs)}
</div>`;
  return layout({ ...p, faqs: homeFaqs }, main, [['หน้าแรก', '']]);
}

const homeFaqs = [
  ['แท็กซี่อุบลเรียกได้กี่โมง', `เรียกได้ตลอด 24 ชั่วโมง ทุกวัน โทร ${site.phone} หรือทัก LINE ${site.lineId}`],
  ['รับส่งสนามบินอุบลราชธานีไหม', 'รับส่งทั้งขาไปและขากลับ แจ้งเลขเที่ยวบิน เราติดตามเวลาเครื่องลงให้'],
  ['เหมารถไปต่างจังหวัดได้ไหม', 'ได้ทั่วประเทศ เช่น กรุงเทพ ขอนแก่น โคราช ศรีสะเกษ ยโสธร มุกดาหาร ราคาตกลงก่อนออกเดินทาง'],
  ['ชำระเงินอย่างไร', 'ชำระเป็นเงินสดหรือโอนผ่านบัญชีธนาคาร/พร้อมเพย์'],
];

function render404() {
  const p = { slug: '404', title: 'ไม่พบหน้าที่ต้องการ | ' + site.name, description: 'ไม่พบหน้าที่ต้องการ', group: 'core' };
  const main = `<section class="hero hero-sub"><div class="wrap">
    <h1>ไม่พบหน้าที่คุณต้องการ</h1>
    <p class="lead">หน้านี้อาจถูกย้ายแล้ว ลองกลับไปหน้าแรก หรือโทรเรียกรถได้เลย</p>
    <div class="cta-row"><a class="btn btn-ghost" href="/">กลับหน้าแรก</a></div>${ctaButtons()}
  </div></section>`;
  return layout(p, main, [['หน้าแรก', '']]).replace('index,follow', 'noindex');
}

// ───────── write output ─────────
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'static'), out, { recursive: true });
rmSync(join(out, 'assets/site.css'));
writeFileSync(join(out, cssHref), css);

const write = (rel, html) => {
  const file = join(out, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

const slugs = new Set();
const pageImages = new Map(); // slug → photo names used (for the image sitemap)
for (const p of pages) {
  if (slugs.has(p.slug)) throw new Error(`duplicate slug: ${p.slug}`);
  slugs.add(p.slug);
  for (const r of p.related ?? []) if (!bySlug.has(r)) throw new Error(`${p.slug}: unknown related slug ${r}`);
  const html = p.slug ? renderPage(p) : renderHome(p);
  pageImages.set(p.slug, [...new Set([...html.matchAll(/src="\/img\/([a-z0-9-]+)-\d+\.webp"/g)].map((m) => m[1]))]);
  write(p.slug ? join(p.slug, 'index.html') : 'index.html', html);
}
write('404.html', render404());

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map((p) => {
    const imgs = pageImages
      .get(p.slug)
      .map((n) => `\n    <image:image><image:loc>${site.origin}/img/${n}-${images[n].widths.at(-1)}.webp</image:loc></image:image>`)
      .join('');
    return `  <url>\n    <loc>${abs(p.slug)}</loc>\n    <lastmod>${today}</lastmod>${imgs}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`);

console.log(`Built ${pages.length} pages (+404) → dist/ (${pages.filter((p) => p.legacy).length} legacy URLs kept)`);
