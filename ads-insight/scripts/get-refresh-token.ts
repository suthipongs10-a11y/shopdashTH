/**
 * M0 — obtain a Google Ads refresh token for local development.
 *
 *   pnpm auth:google [--port 8787]
 *
 * Runs the OAuth authorization-code flow against a throwaway localhost server,
 * then writes GOOGLE_ADS_REFRESH_TOKEN into `.dev.vars`. The token is never
 * printed in full (CLAUDE.md).
 *
 * From M2 the Worker does this itself at /connect/google and stores the token
 * encrypted in D1; this script exists so M0 can be finished before the Worker is.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { SetupError, DEV_VARS_PATH, loadConfig, mask, requireVar, saveDevVar } from './lib/config';
import {
  buildAuthUrl,
  exchangeCode,
  fetchUserEmail,
  SCOPES,
  type OAuthClient,
} from './lib/google-auth';

const CALLBACK_PATH = '/connect/google/callback';

async function main(): Promise<void> {
  const port = readPortArg();
  const config = loadConfig();
  const client: OAuthClient = {
    clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
  };

  const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`;
  const state = randomBytes(16).toString('hex');

  console.log('\n=== เชื่อมบัญชี Google Ads (M0) ===\n');
  console.log(`redirect URI ที่ใช้: ${redirectUri}`);
  console.log('URI นี้ต้องอยู่ใน "Authorized redirect URIs" ของ OAuth client ใน Google Cloud\n');
  console.log(`ขอ scope: ${SCOPES.join(' ')}\n`);
  console.log('เปิดลิงก์นี้ในเบราว์เซอร์แล้วล็อกอินด้วยบัญชีที่เข้าถึง Google Ads ได้:\n');
  console.log(buildAuthUrl(client, redirectUri, state));
  console.log('\nกำลังรอ callback... (กด Ctrl+C เพื่อยกเลิก)\n');

  const code = await waitForCode(port, state);
  const tokens = await exchangeCode(client, code, redirectUri);

  if (!tokens.refresh_token) {
    throw new SetupError(
      'Google ไม่ได้ส่ง refresh token กลับมา — มักเกิดเมื่อเคยให้สิทธิ์แอปนี้ไปแล้ว\n' +
        'แก้โดยถอนสิทธิ์ที่ https://myaccount.google.com/permissions แล้วรันคำสั่งนี้ใหม่',
    );
  }

  const email = await fetchUserEmail(tokens.access_token);
  saveDevVar('GOOGLE_ADS_REFRESH_TOKEN', tokens.refresh_token);

  console.log('✅ ได้ refresh token แล้ว');
  if (email) console.log(`   บัญชี Google: ${email}`);
  console.log(`   scope ที่ได้รับ: ${tokens.scope ?? '(ไม่ระบุ)'}`);
  console.log(`   ค่า (ปิดบังไว้): ${mask(tokens.refresh_token)}`);
  console.log(`   บันทึกลง ${DEV_VARS_PATH} แล้ว\n`);
  console.log('ขั้นต่อไป: ใส่ DEFAULT_CUSTOMER_ID ใน wrangler.toml แล้วรัน `pnpm check:access`\n');

  if (email) {
    console.log(`หมายเหตุ: ใส่ ${email} ใน OWNER_EMAILS ของ .dev.vars ด้วย (ใช้ตอน M2)\n`);
  }
}

/** Serve exactly one callback, then shut down. */
function waitForCode(port: number, expectedState: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404).end('not found');
        return;
      }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      const fail = (message: string) => {
        respond(res, 400, `❌ ${message}`);
        server.close();
        reject(new SetupError(message));
      };

      if (error) return fail(`Google ปฏิเสธคำขอ: ${error}`);
      if (state !== expectedState) return fail('state ไม่ตรงกัน — ยกเลิกเพื่อความปลอดภัย');
      if (!code) return fail('callback ไม่มี authorization code');

      respond(res, 200, '✅ เชื่อมบัญชีสำเร็จ กลับไปที่เทอร์มินัลได้เลย');
      server.close();
      resolve(code);
    });

    server.once('error', reject);
    server.listen(port);
  });
}

function respond(res: import('node:http').ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(
    `<!doctype html><html lang="th"><meta charset="utf-8">` +
      `<title>Ads Insight</title>` +
      `<body style="font-family:system-ui,sans-serif;padding:3rem;text-align:center">` +
      `<p style="font-size:1.25rem">${message}</p></body></html>`,
  );
}

function readPortArg(): number {
  const index = process.argv.indexOf('--port');
  if (index === -1) return 8787;
  const port = Number(process.argv[index + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SetupError('--port ต้องเป็นเลขพอร์ตที่ถูกต้อง');
  }
  return port;
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
