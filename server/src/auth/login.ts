/**
 * Standalone login script: `npm run auth`.
 * Opens a browser, asks you to grant access to the spreadsheet, and caches
 * the token locally so the server can run headlessly afterwards.
 */
import { authorizeInteractive } from './googleAuth.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('auth');

async function main() {
  log.info('Starting Google authorization…');
  log.info('A browser window will open. Sign in and grant access to your sheet.');
  await authorizeInteractive();
  log.info('✓ Authorized. Token cached. You can now run `npm run dev`.');
  process.exit(0);
}

main().catch((err) => {
  log.error('Authorization failed:', err.message ?? err);
  process.exit(1);
});
