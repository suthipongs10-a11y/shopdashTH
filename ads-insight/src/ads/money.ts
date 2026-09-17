/**
 * Money conversion (CLAUDE.md "เงิน").
 *
 * Google Ads works in **micros**: one millionth of the account currency unit,
 * so ฿1.00 is 1_000_000 micros. Every conversion in this project goes through
 * this module — no ad-hoc `/ 1e6` anywhere else.
 *
 * REST returns int64 fields as JSON **strings**, and a large account's lifetime
 * cost can exceed `Number.MAX_SAFE_INTEGER`, so parsing accepts strings and
 * bigint alongside number.
 */

/** Micros per one unit of currency. */
export const MICROS_PER_UNIT = 1_000_000;

export class MoneyError extends Error {
  override name = 'MoneyError';
}

/**
 * Parse an int64-ish value from the API into a number of micros.
 *
 * Throws rather than silently losing precision when the value is too large to
 * be exact as a `number` — callers that expect huge totals use `parseMicrosBig`.
 */
export function parseMicros(value: unknown): number {
  const big = parseMicrosBig(value);
  if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyError(
      `ค่าเงิน ${big} micros เกินช่วงที่ number เก็บได้แม่นยำ — ใช้ parseMicrosBig แทน`,
    );
  }
  return Number(big);
}

/** Same as `parseMicros` but keeps full precision. */
export function parseMicrosBig(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new MoneyError(`ค่าเงินไม่ถูกต้อง: ${value}`);
    if (!Number.isInteger(value)) {
      throw new MoneyError(`micros ต้องเป็นจำนวนเต็ม แต่ได้ ${value}`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) throw new MoneyError(`ค่าเงินไม่ถูกต้อง: "${value}"`);
    return BigInt(trimmed);
  }
  throw new MoneyError(`ค่าเงินไม่ถูกต้อง: ${JSON.stringify(value)}`);
}

/** Micros from the API that may be absent; missing means zero. */
export function parseMicrosOrZero(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  return parseMicros(value);
}

/**
 * Micros to currency units, rounded to 2 decimals — the form every MCP tool
 * and PWA response uses (SPEC §6.1).
 */
export function microsToUnits(micros: unknown): number {
  const big = parseMicrosBig(micros);
  // Round half away from zero on the hundredths, working in integers so that
  // values like 1_005_000 do not drift the way 1.005 does in binary floating point.
  const negative = big < 0n;
  const abs = negative ? -big : big;
  const hundredths = (abs * 100n + BigInt(MICROS_PER_UNIT) / 2n) / BigInt(MICROS_PER_UNIT);
  const result = Number(hundredths) / 100;
  return negative ? -result : result;
}

/** Currency units to micros, for values we send back to Google. */
export function unitsToMicros(units: number): number {
  if (!Number.isFinite(units)) throw new MoneyError(`จำนวนเงินไม่ถูกต้อง: ${units}`);
  const micros = Math.round(units * MICROS_PER_UNIT);
  if (!Number.isSafeInteger(micros)) {
    throw new MoneyError(`จำนวนเงิน ${units} ใหญ่เกินไป`);
  }
  return micros;
}

/** Thai-formatted amount for user-facing text: `฿1,234.56` (PLAYBOOK). */
export function formatUnits(units: number, currency = '฿'): string {
  const negative = units < 0;
  const abs = Math.abs(units);
  const [whole = '0', fraction = '00'] = abs.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${currency}${grouped}.${fraction}`;
}

/** Micros straight to display text. */
export function formatMicros(micros: unknown, currency = '฿'): string {
  return formatUnits(microsToUnits(micros), currency);
}

/**
 * Percentage change from `before` to `after`, to one decimal (SPEC §6.1).
 * Returns undefined when there is no baseline to compare against, which the
 * caller should render as "ไม่มีข้อมูลเทียบ" rather than 0% or Infinity.
 */
export function deltaPct(before: number, after: number): number | undefined {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return undefined;
  if (before === 0) return undefined;
  return round1((after - before) / Math.abs(before) * 100);
}

/** Round to 1 decimal — the precision SPEC §6.1 uses for percentages. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Round to 2 decimals — the precision SPEC §6.1 uses for money and ratios. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Divide where a zero denominator is a real, expected case (no clicks, no
 * conversions). Returns undefined so callers show "—" instead of NaN or ∞.
 */
export function safeDivide(numerator: number, denominator: number): number | undefined {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return undefined;
  if (denominator === 0) return undefined;
  return numerator / denominator;
}
