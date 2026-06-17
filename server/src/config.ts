import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root is two levels up from server/src.
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

function resolveFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p);
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** DEMO=1 runs the app on in-memory sample data with no Google setup. */
  demo: ['1', 'true', 'yes', 'on'].includes((process.env.DEMO ?? '').toLowerCase()),
  spreadsheetId:
    process.env.SPREADSHEET_ID ??
    '1zxqIcFIUX9t3pey6FYtuENkRLhwxRuv5shIJHnLPelU',

  google: {
    credentialsPath: resolveFromRoot(
      process.env.GOOGLE_CREDENTIALS_PATH ?? './credentials.json',
    ),
    tokenPath: resolveFromRoot(process.env.GOOGLE_TOKEN_PATH ?? './token.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  },

  tabs: {
    deals: process.env.SHEET_TAB_DEALS, // optional explicit override
    leads: process.env.SHEET_TAB_LEADS,
  },

  claude: {
    cli: process.env.CLAUDE_CLI ?? 'claude',
    timeoutMs: Number(process.env.ENRICH_TIMEOUT_MS ?? 180_000),
  },

  plugins: {
    enabled: (process.env.ENABLED_PLUGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    webhookNotifierUrl: process.env.WEBHOOK_NOTIFIER_URL ?? '',
  },
} as const;

export type AppConfig = typeof config;
