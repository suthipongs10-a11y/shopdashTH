import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Project root, independent of the cwd the script was launched from. */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEV_VARS_PATH = resolve(PROJECT_ROOT, '.dev.vars');
export const WRANGLER_PATH = resolve(PROJECT_ROOT, 'wrangler.toml');

/**
 * Parse a `.dev.vars` file (the same KEY=value format wrangler reads).
 * Blank lines and `#` comments are skipped; surrounding quotes are stripped.
 */
export function parseDevVars(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

/** Replace `key`'s line in `.dev.vars` content, or append it if absent. */
export function upsertDevVar(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^[ \\t]*${escapeRegExp(key)}[ \\t]*=.*$`, 'm');
  if (pattern.test(content)) return content.replace(pattern, line);
  const base = content === '' || content.endsWith('\n') ? content : `${content}\n`;
  return `${base}${line}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Read the `[vars]` table out of wrangler.toml so scripts and the Worker share
 * one source of truth for non-secret config.
 *
 * Deliberately minimal: string values on a single line only, which is all
 * wrangler.toml uses here. It is not a general TOML parser.
 */
export function parseWranglerVars(toml: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inVars = false;
  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      inVars = line === '[vars]';
      continue;
    }
    if (!inVars) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*"(.*)"$/.exec(line);
    if (match) out[match[1]!] = match[2]!;
  }
  return out;
}

/** Non-secret vars from wrangler.toml, overlaid with anything in `.dev.vars`. */
export function loadConfig(): Record<string, string> {
  if (!existsSync(DEV_VARS_PATH)) {
    throw new SetupError(
      'ไม่พบไฟล์ .dev.vars — คัดลอกจาก .dev.vars.example แล้วกรอกค่าก่อน:\n' +
        '  cp .dev.vars.example .dev.vars',
    );
  }
  const vars = existsSync(WRANGLER_PATH)
    ? parseWranglerVars(readFileSync(WRANGLER_PATH, 'utf8'))
    : {};
  return { ...vars, ...parseDevVars(readFileSync(DEV_VARS_PATH, 'utf8')) };
}

/** Read a required key, with a Thai error naming what to fix. */
export function requireVar(config: Record<string, string>, key: string): string {
  const value = config[key]?.trim();
  if (!value) {
    throw new SetupError(`ยังไม่ได้ตั้งค่า ${key} — กรอกใน .dev.vars (ดู .dev.vars.example)`);
  }
  return value;
}

/** Write a value into `.dev.vars`, creating the file if needed. */
export function saveDevVar(key: string, value: string): void {
  const current = existsSync(DEV_VARS_PATH) ? readFileSync(DEV_VARS_PATH, 'utf8') : '';
  writeFileSync(DEV_VARS_PATH, upsertDevVar(current, key, value), { mode: 0o600 });
}

/**
 * Mask a secret for display. Never print tokens or secrets in full
 * (CLAUDE.md: "ห้าม log refresh token, access token, หรือ secrets").
 */
export function mask(secret: string): string {
  if (secret.length <= 8) return '*'.repeat(secret.length);
  return `${secret.slice(0, 4)}…${secret.slice(-4)} (${secret.length} ตัวอักษร)`;
}

/** Setup problems in the M0 scripts. Worker-side config errors are `ConfigError` in src/config.ts. */
export class SetupError extends Error {
  override name = 'SetupError';
}
