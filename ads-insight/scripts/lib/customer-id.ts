/** Google Ads customer IDs are 10 digits; we store and send them without dashes. */
export const CUSTOMER_ID_RE = /^\d{10}$/;

/** Strip the dashes and spaces people copy out of the Google Ads UI. */
export function normalizeCustomerId(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

export function isCustomerId(raw: string): boolean {
  return CUSTOMER_ID_RE.test(normalizeCustomerId(raw));
}

/** Normalize and validate, or throw naming which setting is wrong. */
export function assertCustomerId(raw: string, label: string): string {
  const id = normalizeCustomerId(raw);
  if (!CUSTOMER_ID_RE.test(id)) {
    throw new Error(
      `${label} ไม่ถูกต้อง: "${raw}" — ต้องเป็นตัวเลข 10 หลักไม่มีขีด (เช่น 1234567890)`,
    );
  }
  return id;
}

/** Display form, matching how Google Ads shows it: 123-456-7890. */
export function formatCustomerId(raw: string): string {
  const id = normalizeCustomerId(raw);
  if (!CUSTOMER_ID_RE.test(id)) return raw;
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
}
