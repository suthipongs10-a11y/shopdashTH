/**
 * Ask Google which GAQL fields exist in the configured API version.
 *
 *   pnpm fields campaign.%date%
 *   pnpm fields "campaign.%" --selectable
 *
 * CLAUDE.md requires checking field names against the API rather than memory
 * before writing a query. This is that check: `campaign.start_date` and
 * `campaign.end_date` were rejected by v25 and guessing replacements would have
 * repeated the v26 mistake.
 *
 * Read-only, one API call.
 */
import { loadConfig, requireVar } from './lib/config';
import { refreshAccessToken } from './lib/google-auth';
import { searchFields } from './lib/ads-rest';
import { quote } from '../src/ads/gaql';

interface FieldRow {
  name?: string;
  category?: string;
  dataType?: string;
  selectable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  isRepeated?: boolean;
}

async function main(): Promise<void> {
  const raw = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!raw) {
    console.error(
      '\nระบุคำที่จะค้น\n\n' +
        '  pnpm fields date               # ค้นทุกฟิลด์ที่มีคำว่า date\n' +
        '  pnpm fields impression --selectable\n' +
        '  pnpm fields "campaign.%"       # ใส่ % เองก็ได้ (ครอบด้วย " " บน Windows)\n',
    );
    process.exit(1);
  }

  // A pattern with no % is wrapped in one. Besides being shorter to type, it
  // avoids `pnpm fields campaign.%date%`, where cmd.exe expands %date% into
  // today's date before the script ever sees it.
  const pattern = raw.includes('%') ? raw : `%${raw}%`;

  const selectableOnly = process.argv.includes('--selectable');

  const config = loadConfig();
  const apiVersion = requireVar(config, 'ADS_API_VERSION');
  const tokens = await refreshAccessToken(
    {
      clientId: requireVar(config, 'GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: requireVar(config, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    requireVar(config, 'GOOGLE_ADS_REFRESH_TOKEN'),
  );

  console.log(`\n=== ฟิลด์ที่มีจริงใน ${apiVersion} ที่ตรงกับ "${pattern}" ===\n`);

  const rows = (await searchFields({
    apiVersion,
    accessToken: tokens.access_token,
    query:
      'SELECT name, category, data_type, selectable, filterable, sortable, is_repeated ' +
      `WHERE name LIKE ${quote(pattern)} ORDER BY name`,
  })) as FieldRow[];

  const shown = selectableOnly ? rows.filter((r) => r.selectable) : rows;

  if (shown.length === 0) {
    console.log('ไม่พบฟิลด์ที่ตรงกับรูปแบบนี้ — ลองใช้ % ให้กว้างขึ้น เช่น "campaign.%"\n');
    return;
  }

  for (const row of shown) {
    const flags = [
      row.selectable ? 'select' : '',
      row.filterable ? 'filter' : '',
      row.sortable ? 'sort' : '',
      row.isRepeated ? 'repeated' : '',
    ]
      .filter(Boolean)
      .join(',');
    console.log(`${(row.name ?? '?').padEnd(56)} ${(row.dataType ?? '').padEnd(12)} ${flags}`);
  }

  console.log(`\nรวม ${shown.length} ฟิลด์${selectableOnly ? ' (เฉพาะที่ select ได้)' : ''}\n`);
}

main().catch((err: unknown) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
