/**
 * GAQL query builder and validator (SPEC §6.3).
 *
 * Two users:
 *  - our own report code, which composes queries from the typed builder
 *  - `gads_run_gaql`, the escape hatch that accepts a query string from Claude
 *    and must therefore be checked: SELECT only, LIMIT capped, fields on an
 *    allowlist
 *
 * Values reaching a WHERE clause may come from ad account data — search terms,
 * campaign names, ad text — which SPEC §5.4 treats as untrusted. Every literal
 * goes through `quote()`; nothing is concatenated raw.
 *
 * Runtime-agnostic (SPEC §2 D1).
 */

export class GaqlError extends Error {
  override name = 'GaqlError';
}

/** `resource.field` or `resource.nested.field`, lowercase snake_case only. */
const FIELD_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/**
 * Resource prefixes this project reads (SPEC §6.3). Restricting by prefix
 * rather than enumerating thousands of field names keeps the list maintainable
 * while still refusing anything unexpected.
 */
export const ALLOWED_FIELD_PREFIXES = [
  'customer',
  'customer_client',
  'campaign',
  'campaign_budget',
  'campaign_criterion',
  'ad_group',
  'ad_group_ad',
  'ad_group_ad_asset_view',
  'ad_group_criterion',
  'keyword_view',
  'search_term_view',
  'landing_page_view',
  'geographic_view',
  'user_location_view',
  'age_range_view',
  'gender_view',
  'conversion_action',
  'asset',
  'campaign_asset',
  'customer_asset',
  'recommendation',
  'change_event',
  'bidding_strategy',
  'metrics',
  'segments',
] as const;

const ALLOWED_PREFIX_SET = new Set<string>(ALLOWED_FIELD_PREFIXES);

/** Date range keywords GAQL accepts in `DURING`. */
export const DATE_RANGE_LITERALS = [
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'LAST_BUSINESS_WEEK',
  'LAST_MONTH',
  'LAST_WEEK_MON_SUN',
  'LAST_WEEK_SUN_SAT',
  'THIS_MONTH',
  'THIS_WEEK_MON_TODAY',
  'THIS_WEEK_SUN_TODAY',
] as const;

const DATE_RANGE_SET = new Set<string>(DATE_RANGE_LITERALS);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The cap SPEC §6.3 puts on the free-form GAQL tool. */
export const MAX_LIMIT = 1000;

/** Quote a string literal, escaping what would otherwise break out of it. */
export function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Validate a field reference; throws rather than letting it reach Google. */
export function assertField(field: string): string {
  if (!FIELD_RE.test(field)) {
    throw new GaqlError(`ชื่อฟิลด์ไม่ถูกต้อง: "${field}"`);
  }
  const prefix = field.split('.')[0]!;
  if (!ALLOWED_PREFIX_SET.has(prefix)) {
    throw new GaqlError(
      `ฟิลด์ "${field}" ไม่อยู่ในรายการที่อนุญาต (resource "${prefix}") — ` +
        'ถ้าจำเป็นต้องใช้ ให้เพิ่มใน ALLOWED_FIELD_PREFIXES ของ src/ads/gaql.ts',
    );
  }
  return field;
}

/** Validate the resource named after FROM. */
export function assertResource(resource: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(resource)) {
    throw new GaqlError(`ชื่อ resource ไม่ถูกต้อง: "${resource}"`);
  }
  if (!ALLOWED_PREFIX_SET.has(resource)) {
    throw new GaqlError(
      `ไม่อนุญาตให้ query จาก "${resource}" — ` +
        'ถ้าจำเป็นต้องใช้ ให้เพิ่มใน ALLOWED_FIELD_PREFIXES ของ src/ads/gaql.ts',
    );
  }
  return resource;
}

export function assertDate(value: string): string {
  if (!DATE_RE.test(value)) throw new GaqlError(`วันที่ต้องเป็นรูปแบบ YYYY-MM-DD: "${value}"`);
  return value;
}

export type Condition = string & { readonly __gaqlCondition: unique symbol };

function condition(text: string): Condition {
  return text as Condition;
}

export const where = {
  eq: (field: string, value: string | number | boolean): Condition =>
    condition(`${assertField(field)} = ${literal(value)}`),
  neq: (field: string, value: string | number | boolean): Condition =>
    condition(`${assertField(field)} != ${literal(value)}`),
  gt: (field: string, value: number): Condition =>
    condition(`${assertField(field)} > ${numberLiteral(value)}`),
  gte: (field: string, value: number): Condition =>
    condition(`${assertField(field)} >= ${numberLiteral(value)}`),
  lt: (field: string, value: number): Condition =>
    condition(`${assertField(field)} < ${numberLiteral(value)}`),
  lte: (field: string, value: number): Condition =>
    condition(`${assertField(field)} <= ${numberLiteral(value)}`),

  in: (field: string, values: readonly (string | number)[]): Condition => {
    if (values.length === 0) throw new GaqlError(`IN ต้องมีอย่างน้อย 1 ค่า (ฟิลด์ ${field})`);
    return condition(`${assertField(field)} IN (${values.map(literal).join(', ')})`);
  },
  notIn: (field: string, values: readonly (string | number)[]): Condition => {
    if (values.length === 0) throw new GaqlError(`NOT IN ต้องมีอย่างน้อย 1 ค่า (ฟิลด์ ${field})`);
    return condition(`${assertField(field)} NOT IN (${values.map(literal).join(', ')})`);
  },

  /** `DURING LAST_30_DAYS` — the keyword form, validated against the enum. */
  during: (field: string, range: string): Condition => {
    if (!DATE_RANGE_SET.has(range)) {
      throw new GaqlError(`ช่วงวันที่ไม่ถูกต้อง: "${range}"`);
    }
    return condition(`${assertField(field)} DURING ${range}`);
  },

  /** `BETWEEN '2026-09-01' AND '2026-09-30'` — the explicit form. */
  between: (field: string, start: string, end: string): Condition =>
    condition(
      `${assertField(field)} BETWEEN ${quote(assertDate(start))} AND ${quote(assertDate(end))}`,
    ),

  /** Substring match. The needle is quoted, so account data is safe to pass. */
  contains: (field: string, value: string): Condition =>
    condition(`${assertField(field)} LIKE ${quote(`%${value}%`)}`),
};

function literal(value: string | number | boolean): string {
  if (typeof value === 'number') return numberLiteral(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return quote(value);
}

function numberLiteral(value: number): string {
  if (!Number.isFinite(value)) throw new GaqlError(`ตัวเลขไม่ถูกต้อง: ${value}`);
  return String(value);
}

export interface QuerySpec {
  select: readonly string[];
  from: string;
  where?: readonly Condition[];
  orderBy?: readonly { field: string; direction?: 'ASC' | 'DESC' }[];
  limit?: number;
}

/** Compose a validated query string. */
export function buildQuery(spec: QuerySpec): string {
  if (spec.select.length === 0) throw new GaqlError('ต้องเลือกอย่างน้อย 1 ฟิลด์');

  const parts = [
    `SELECT ${spec.select.map(assertField).join(', ')}`,
    `FROM ${assertResource(spec.from)}`,
  ];

  if (spec.where && spec.where.length > 0) {
    parts.push(`WHERE ${spec.where.join(' AND ')}`);
  }

  if (spec.orderBy && spec.orderBy.length > 0) {
    const ordering = spec.orderBy
      .map((o) => `${assertField(o.field)} ${o.direction ?? 'DESC'}`)
      .join(', ');
    parts.push(`ORDER BY ${ordering}`);
  }

  if (spec.limit !== undefined) {
    parts.push(`LIMIT ${assertLimit(spec.limit)}`);
  }

  return parts.join(' ');
}

export function assertLimit(limit: number, max = MAX_LIMIT): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new GaqlError(`LIMIT ต้องเป็นจำนวนเต็มบวก แต่ได้ ${limit}`);
  }
  if (limit > max) throw new GaqlError(`LIMIT ต้องไม่เกิน ${max} แต่ได้ ${limit}`);
  return limit;
}

export interface RawGaqlOptions {
  maxLimit?: number;
  /** Add `LIMIT <maxLimit>` when the query has none, instead of rejecting it. */
  addLimitIfMissing?: boolean;
}

/**
 * Check a query string written by Claude before it reaches Google
 * (`gads_run_gaql`, SPEC §6.3). Read-only, capped, allowlisted.
 */
export function validateRawGaql(query: string, options: RawGaqlOptions = {}): string {
  const maxLimit = options.maxLimit ?? MAX_LIMIT;
  const trimmed = query.trim().replace(/;+\s*$/, '');

  if (trimmed === '') throw new GaqlError('คำสั่งว่างเปล่า');
  if (trimmed.includes(';')) {
    throw new GaqlError('ห้ามมีหลายคำสั่งใน query เดียว (พบเครื่องหมาย ;)');
  }
  if (!/^SELECT\s/i.test(trimmed)) {
    throw new GaqlError('อนุญาตเฉพาะคำสั่ง SELECT เท่านั้น');
  }

  const selectMatch = /^SELECT\s+([\s\S]+?)\s+FROM\s+([a-z][a-z0-9_]*)/i.exec(trimmed);
  if (!selectMatch) throw new GaqlError('รูปแบบ query ไม่ถูกต้อง — ต้องมีทั้ง SELECT และ FROM');

  const [, selectList = '', resource = ''] = selectMatch;
  assertResource(resource);

  for (const raw of selectList.split(',')) {
    const field = raw.trim();
    if (field === '') throw new GaqlError('มีฟิลด์ว่างในรายการ SELECT');
    assertField(field);
  }

  const limitMatch = /\bLIMIT\s+(\d+)\s*$/i.exec(trimmed);
  if (!limitMatch) {
    if (!options.addLimitIfMissing) {
      throw new GaqlError(`ต้องระบุ LIMIT (ไม่เกิน ${maxLimit})`);
    }
    return `${trimmed} LIMIT ${maxLimit}`;
  }

  assertLimit(Number(limitMatch[1]), maxLimit);
  return trimmed;
}
