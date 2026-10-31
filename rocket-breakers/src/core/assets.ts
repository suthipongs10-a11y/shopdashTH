// Logical asset_id -> manifest row. Anything not yet "integrated" resolves to a
// labelled placeholder in development; release validation reports it as missing.
import manifestCsv from "../../art/asset_manifest.csv?raw";

export interface AssetRow { asset_id: string; category: string; status: string; [k: string]: string }
export interface Resolved { assetId: string; status: string; path: string; placeholder: boolean }

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export class AssetResolver {
  readonly rows = new Map<string, AssetRow>();
  readonly errors: string[] = [];

  constructor(csv: string = manifestCsv) {
    const [header, ...lines] = parseCsv(csv);
    for (const line of lines) {
      const row = Object.fromEntries(header.map((h, i) => [h, line[i] ?? ""])) as AssetRow;
      if (this.rows.has(row.asset_id)) this.errors.push(`duplicate asset_id ${row.asset_id}`);
      this.rows.set(row.asset_id, row);
    }
  }

  resolve(assetId: string): Resolved {
    const row = this.rows.get(assetId);
    const status = row?.status ?? "unknown";
    const path = row?.runtime_path ?? "";
    return { assetId, status, path, placeholder: !(status === "integrated" && path) };
  }

  // Release gate: required ids that are not integrated yet.
  missingForRelease(ids: string[]): string[] {
    return ids.filter((id) => this.resolve(id).placeholder);
  }
}
