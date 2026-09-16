import { z } from 'zod';

/**
 * Configuration schema and validation (SPEC §5.4).
 *
 * Runtime-agnostic on purpose: no Workers or Node globals, so the same code
 * validates a Worker `Env`, a `process.env`, or a parsed `.dev.vars`. Worker
 * bindings live in `src/env.ts` (SPEC §2 D1 — keep the core portable).
 */

/** Google Ads customer IDs are 10 digits, stored without dashes. */
export const CUSTOMER_ID_RE = /^\d{10}$/;

/** A customer ID that may be left blank until M0 fills it in. */
const optionalCustomerId = z
  .string()
  .default('')
  .refine((v) => v === '' || CUSTOMER_ID_RE.test(v), {
    message: 'ต้องเป็นตัวเลข 10 หลักไม่มีขีด (เช่น 1234567890) หรือเว้นว่าง',
  });

const requiredSecret = (name: string) =>
  z.string().min(1, `ยังไม่ได้ตั้งค่า ${name} — ดู .dev.vars.example`);

export const configSchema = z.object({
  ENV: z.enum(['dev', 'staging', 'production']).default('dev'),
  ACCOUNT_TZ: z.string().min(1).default('Asia/Bangkok'),
  ADS_API_VERSION: z
    .string()
    .regex(/^v\d+$/, 'ADS_API_VERSION ต้องอยู่ในรูปแบบ v<เลขเวอร์ชัน> เช่น v25'),
  DEFAULT_CUSTOMER_ID: optionalCustomerId,
  LOGIN_CUSTOMER_ID: optionalCustomerId,
  TEST_CUSTOMER_ID: optionalCustomerId,

  GOOGLE_OAUTH_CLIENT_ID: requiredSecret('GOOGLE_OAUTH_CLIENT_ID'),
  GOOGLE_OAUTH_CLIENT_SECRET: requiredSecret('GOOGLE_OAUTH_CLIENT_SECRET'),
  OWNER_EMAILS: requiredSecret('OWNER_EMAILS'),
  TOKEN_ENC_KEY: requiredSecret('TOKEN_ENC_KEY'),
  SESSION_SECRET: requiredSecret('SESSION_SECRET'),
  DEV_BEARER_TOKEN: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Keys `configReport` inspects; secrets are reported as present/absent only. */
export const CONFIG_KEYS = [
  'ADS_API_VERSION',
  'DEFAULT_CUSTOMER_ID',
  'LOGIN_CUSTOMER_ID',
  'TEST_CUSTOMER_ID',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'OWNER_EMAILS',
  'TOKEN_ENC_KEY',
  'SESSION_SECRET',
  'DEV_BEARER_TOKEN',
] as const;

export class ConfigError extends Error {
  override name = 'ConfigError';
  constructor(public readonly issues: string[]) {
    super(`ตั้งค่า environment ไม่ครบ:\n- ${issues.join('\n- ')}`);
  }
}

/** Validate the whole configuration, or throw listing every problem at once. */
export function parseConfig(source: Record<string, unknown>): AppConfig {
  const result = configSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return result.data;
}

/** Emails allowed to authorize the MCP connector / sign in to the PWA. */
export function ownerEmails(config: Pick<AppConfig, 'OWNER_EMAILS'>): string[] {
  return config.OWNER_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Which configuration keys are present — booleans only, never values.
 * Used by `/health` so M0 setup can be checked without exposing secrets.
 */
export function configReport(source: Record<string, unknown>): Record<string, boolean> {
  const report: Record<string, boolean> = {};
  for (const key of CONFIG_KEYS) {
    const value = source[key];
    report[key] = typeof value === 'string' && value.length > 0;
  }
  return report;
}
