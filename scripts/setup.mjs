#!/usr/bin/env node
/**
 * Friendly preflight for local setup: `npm run setup`.
 * - verifies Node version
 * - creates .env from the template if missing
 * - checks for the Google OAuth credentials file
 * - prints exactly what to do next
 */
import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const p = (f) => resolve(root, f);

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
};
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`);
const info = (m) => console.log(`  ${C.dim}${m}${C.reset}`);

console.log(`\n${C.bold}Origin CRM — local setup${C.reset}\n`);

// 1. Node version
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`Node ${process.versions.node}`);
else {
  console.log(`${C.red}✗ Node ${process.versions.node} — need v20+.${C.reset}`);
  process.exit(1);
}

// 2. .env
if (existsSync(p('.env'))) {
  ok('.env present');
} else if (existsSync(p('.env.example'))) {
  copyFileSync(p('.env.example'), p('.env'));
  ok('.env created from .env.example');
} else {
  warn('.env.example missing — are you in the project root?');
}

// 3. credentials.json
const hasCreds = existsSync(p('credentials.json'));
const hasToken = existsSync(p('token.json'));

console.log(`\n${C.bold}Next steps${C.reset}\n`);

if (hasToken) {
  ok('Already authorized with Google (token.json found).');
  console.log(`\n  Start the app:  ${C.cyan}npm run dev${C.reset}  → http://localhost:5173\n`);
} else if (hasCreds) {
  ok('credentials.json found.');
  console.log(`\n  1) Log in:      ${C.cyan}npm run auth${C.reset}   (opens a browser)`);
  console.log(`  2) Start:       ${C.cyan}npm run dev${C.reset}    → http://localhost:5173\n`);
} else {
  warn('No credentials.json yet — needed to connect Google Sheets.');
  info('Google Cloud Console → enable "Google Sheets API"');
  info('→ Credentials → Create credentials → OAuth client ID → "Desktop app"');
  info('→ Download the JSON, rename to credentials.json, place in this folder.');
  console.log(`\n  Then:           ${C.cyan}npm run auth${C.reset}  and  ${C.cyan}npm run dev${C.reset}`);
  console.log(`\n  ${C.bold}Or try it right now with sample data (no Google needed):${C.reset}`);
  console.log(`                  ${C.cyan}npm run demo${C.reset}    → http://localhost:5173\n`);
}
