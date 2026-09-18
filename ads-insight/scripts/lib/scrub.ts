/**
 * Strip identifying data out of Google Ads responses before they become
 * fixtures (SPEC §12 M1, `test/fixtures/README.md`).
 *
 * The goal is fixtures that still exercise the analysis code — same shape, same
 * cardinality, same metric values — while carrying nothing that identifies the
 * account, its customers or its ads.
 *
 * Replacements are **stable within a run**: the same input always maps to the
 * same pseudonym, so joins between rows survive (a campaign id in one row still
 * matches the same campaign id in another). They are deliberately *not* stable
 * across runs, so re-capturing does not let anyone correlate two exports.
 *
 * Pure: no file or network access, so it is fully unit-testable.
 */

/** Keys whose values name something and must be replaced. */
const NAME_KEYS = new Set([
  'descriptiveName',
  'name',
  'accountName',
  'promptpayAccountName',
]);

/** Keys holding free text written by the advertiser. */
const TEXT_KEYS = new Set([
  'text',
  'headline',
  'description',
  'description1',
  'description2',
  'searchTerm',
  'keywordText',
  'businessName',
  'longHeadline',
]);

/** Keys holding a URL. */
const URL_KEYS = new Set([
  'finalUrl',
  'finalUrls',
  'finalMobileUrls',
  'expandedFinalUrl',
  'displayUrl',
  'trackingUrlTemplate',
  'finalUrlSuffix',
  'unexpandedFinalUrl',
  'urlCustomParameters',
]);

/** Keys that are always direct contact details. */
const CONTACT_KEYS = new Set(['phoneNumber', 'email', 'emailAddress']);

/** Keys whose numeric value is an identifier rather than a measurement. */
const ID_KEYS = new Set([
  'id',
  'customerId',
  'customerClient',
  'clientCustomer',
  'resourceName',
  'campaign',
  'adGroup',
  'adGroupAd',
  'criterionId',
  'conversionActionId',
  'budget',
  'campaignBudget',
  'biddingStrategy',
  'labels',
  'loginCustomerId',
]);

/**
 * Containers whose every descendant is a measurement, never an identifier.
 *
 * Google Ads nests all performance numbers under `metrics`, so one entry here
 * protects every metric that exists now or is added to a query later.
 */
const MEASUREMENT_CONTAINERS = new Set(['metrics']);

/**
 * A key naming a measurement rather than something identifying.
 *
 * Money outside `metrics` — budgets, bids, bid ceilings, targets — all ends in
 * `Micros` in the REST API, so the suffix catches them without listing each
 * field and without going stale when a query starts selecting a new one.
 */
function isMeasurementKey(key: string | undefined): boolean {
  return key !== undefined && key.endsWith('Micros');
}

/** Every key this module deliberately rewrites. Used by the guard below. */
const CATALOGUED_KEYS = new Set([
  ...NAME_KEYS,
  ...TEXT_KEYS,
  ...URL_KEYS,
  ...CONTACT_KEYS,
  ...ID_KEYS,
]);

/** Six or more consecutive digits — Google Ads ids, never a metric we keep. */
const ID_RUN_RE = /\d{6,}/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
/**
 * Thai mobile and landline shapes: `08x-xxx-xxxx`, `02-xxx-xxxx`, `+66 8x xxx xxxx`.
 *
 * The lookarounds matter more than the shape. Without them this matches *inside*
 * a longer number: `1080000000` (a budget in micros) contains `080000000`, and
 * replacing that turned ฿1,080 into the string "1080-000-0000". Worse, the id
 * sweep runs first, so it was mangling the fake ids this module had just
 * generated. A phone number is never flanked by more digits.
 */
const PHONE_RE = /(?<!\d)(?:\+?66[\s-]?|0)\d{1,2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g;

export interface ScrubReport {
  ids: number;
  names: number;
  texts: number;
  urls: number;
  contacts: number;
}

export interface Scrubber {
  scrub(value: unknown): unknown;
  report(): ScrubReport;
}

export interface ScrubOptions {
  /**
   * Keep search terms as they are. Off by default: people type personal things
   * into search boxes, and a search term is free text from the public.
   */
  keepSearchTerms?: boolean;
}

export function createScrubber(options: ScrubOptions = {}): Scrubber {
  const ids = new Map<string, string>();
  const names = new Map<string, string>();
  const texts = new Map<string, string>();
  const urls = new Map<string, string>();

  let contacts = 0;

  /** Stable pseudonym for an id, preserving digit-ness so parsers still work. */
  function fakeId(original: string): string {
    let replacement = ids.get(original);
    if (!replacement) {
      replacement = String(1_000_000_000 + ids.size + 1);
      ids.set(original, replacement);
    }
    return replacement;
  }

  function pseudonym(
    store: Map<string, string>,
    prefix: string,
    original: string,
  ): string {
    let replacement = store.get(original);
    if (!replacement) {
      replacement = `${prefix}-${store.size + 1}`;
      store.set(original, replacement);
    }
    return replacement;
  }

  /** Replace every long digit run, which covers ids embedded in resource names. */
  function scrubIdsInString(value: string): string {
    return value.replace(ID_RUN_RE, (match) => fakeId(match));
  }

  /** Catch contact details wherever they appear, not only under known keys. */
  function scrubContacts(value: string): string {
    let result = value;
    result = result.replace(EMAIL_RE, () => {
      contacts += 1;
      return 'someone@example.com';
    });
    result = result.replace(PHONE_RE, () => {
      contacts += 1;
      return '080-000-0000';
    });
    return result;
  }

  /**
   * @param inMeasurement whether `value` sits inside a measurement container,
   *   in which case it is returned untouched. Fixtures exist to test arithmetic
   *   on real numbers; a scrubber that rewrites a cost has destroyed the only
   *   thing the file was for. The id sweep below used to do exactly that: a
   *   budget of `"1080000000"` micros is a ten-digit run, so it was swapped for
   *   a fake id and ฿1,080 silently became ฿1,000.
   */
  function scrubValue(
    key: string | undefined,
    value: unknown,
    inMeasurement: boolean,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => scrubValue(key, item, inMeasurement));
    }

    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        out[childKey] = scrubValue(
          childKey,
          childValue,
          inMeasurement || MEASUREMENT_CONTAINERS.has(childKey),
        );
      }
      return out;
    }

    if (typeof value !== 'string') return value;

    if (inMeasurement || isMeasurementKey(key)) return value;

    if (key !== undefined) {
      if (URL_KEYS.has(key)) return pseudonym(urls, 'https://example.com/page', value);
      if (CONTACT_KEYS.has(key)) {
        contacts += 1;
        return key === 'phoneNumber' ? '080-000-0000' : 'someone@example.com';
      }
      if (NAME_KEYS.has(key)) return pseudonym(names, 'name', value);
      if (TEXT_KEYS.has(key)) {
        if (key === 'searchTerm' && options.keepSearchTerms) return scrubContacts(value);
        return pseudonym(texts, 'text', value);
      }
      if (ID_KEYS.has(key)) return scrubIdsInString(value);
    }

    // Anything else: still sweep for ids and contact details, because a field we
    // have not catalogued can carry them (a note, a label, a custom parameter).
    return scrubContacts(scrubIdsInString(value));
  }

  return {
    scrub: (value) => scrubValue(undefined, value, false),
    report: () => ({
      ids: ids.size,
      names: names.size,
      texts: texts.size,
      urls: urls.size,
      contacts,
    }),
  };
}

/** Convenience for one-off use. */
export function scrub(value: unknown, options?: ScrubOptions): unknown {
  return createScrubber(options).scrub(value);
}

/**
 * Last line of defence before writing a fixture: look for anything that still
 * looks identifying. Returns the problems found, empty when clean.
 */
export function findLeaks(
  serialized: string,
  known: { customerIds?: string[]; accountNames?: string[] } = {},
): string[] {
  const problems: string[] = [];

  for (const id of known.customerIds ?? []) {
    const bare = id.replace(/[\s-]/g, '');
    if (bare !== '' && serialized.includes(bare)) {
      problems.push(`พบ Customer ID จริง (${bare}) ในไฟล์`);
    }
  }
  for (const name of known.accountNames ?? []) {
    if (name.trim() !== '' && serialized.includes(name)) {
      problems.push(`พบชื่อบัญชีจริง ("${name}") ในไฟล์`);
    }
  }
  const emails = serialized.match(EMAIL_RE)?.filter((e) => !e.endsWith('@example.com')) ?? [];
  if (emails.length > 0) problems.push(`พบอีเมล ${emails.length} รายการที่ยังไม่ถูกแทนที่`);

  return problems;
}

/**
 * Second line of defence, facing the other way from `findLeaks`: it looks for
 * data the scrubber *destroyed* rather than data it failed to remove.
 *
 * The rule is narrow on purpose — a purely numeric value under a key this
 * module does not catalogue must come out exactly as it went in. Metrics,
 * budgets and bids all match that description; ids, names, text and URLs are
 * catalogued and so are allowed to change.
 *
 * It does not share the measurement logic above, deliberately: a guard that
 * reuses the rule it checks agrees with the bug. Twice now a sweep meant for
 * ids has eaten a number, and both times the unit tests passed.
 */
export function findMeasurementChanges(
  before: unknown,
  after: unknown,
  path = '',
): string[] {
  const problems: string[] = [];

  if (Array.isArray(before)) {
    if (!Array.isArray(after) || after.length !== before.length) {
      problems.push(`${path || '(root)'}: จำนวนแถวเปลี่ยนไป`);
      return problems;
    }
    before.forEach((item, index) => {
      problems.push(...findMeasurementChanges(item, after[index], `${path}[${index}]`));
    });
    return problems;
  }

  if (before !== null && typeof before === 'object') {
    if (after === null || typeof after !== 'object' || Array.isArray(after)) {
      problems.push(`${path || '(root)'}: โครงสร้างเปลี่ยนไป`);
      return problems;
    }
    const source = before as Record<string, unknown>;
    const result = after as Record<string, unknown>;
    for (const [key, value] of Object.entries(source)) {
      if (!(key in result)) {
        problems.push(`${path}.${key}: หายไปจากผลลัพธ์`);
        continue;
      }
      problems.push(...findMeasurementChanges(value, result[key], `${path}.${key}`));
    }
    return problems;
  }

  const key = path.split('.').pop()?.replace(/\[\d+\]$/, '') ?? '';
  if (CATALOGUED_KEYS.has(key)) return problems;
  if (!isNumericLeaf(before)) return problems;
  if (before !== after) {
    problems.push(`${path}: ตัวเลขถูกแก้จาก ${JSON.stringify(before)} เป็น ${JSON.stringify(after)}`);
  }
  return problems;
}

/** A number, or an int64 the REST API sent as a digits-only string. */
function isNumericLeaf(value: unknown): boolean {
  if (typeof value === 'number') return true;
  return typeof value === 'string' && /^-?\d+$/.test(value.trim()) && value.trim() !== '';
}
