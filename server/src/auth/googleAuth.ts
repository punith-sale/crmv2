import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('auth');

export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

/** Load a previously-authorized client from the cached token file. */
async function loadSavedClient(): Promise<OAuth2Client | null> {
  try {
    const content = await fs.readFile(config.google.tokenPath, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as unknown as OAuth2Client;
  } catch {
    return null;
  }
}

/** Persist the refresh token so future runs don't need a browser. */
async function saveClient(client: OAuth2Client): Promise<void> {
  const content = await fs.readFile(config.google.credentialsPath, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed ?? keys.web;
  if (!key) {
    throw new Error(
      'credentials.json is not a valid OAuth client file (expected an "installed" or "web" key).',
    );
  }
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(config.google.tokenPath, payload);
  log.info(`Saved Google token to ${config.google.tokenPath}`);
}

/**
 * Interactive authorization — opens a browser for consent. Used by the
 * `npm run auth` script and as a fallback on first server start.
 */
export async function authorizeInteractive(): Promise<OAuth2Client> {
  const existing = await loadSavedClient();
  if (existing) {
    log.info('Using cached Google credentials.');
    return existing;
  }
  if (!existsSync(config.google.credentialsPath)) {
    throw new AuthRequiredError(
      `Missing ${config.google.credentialsPath}. Download an OAuth "Desktop app" ` +
        `client from the Google Cloud Console and save it there. See README.`,
    );
  }
  // Lazy import so the server can run without this dep loaded until needed.
  const { authenticate } = await import('@google-cloud/local-auth');
  const client = (await authenticate({
    scopes: [...config.google.scopes],
    keyfilePath: config.google.credentialsPath,
  })) as OAuth2Client;
  if (client.credentials?.refresh_token) {
    await saveClient(client);
  }
  return client;
}

/**
 * Non-interactive: returns the cached client or throws AuthRequiredError.
 * The server uses this so a missing login surfaces as a clear API error
 * rather than hanging on a browser prompt.
 */
export async function getAuthClient(): Promise<OAuth2Client> {
  const client = await loadSavedClient();
  if (!client) {
    throw new AuthRequiredError(
      'Not authorized with Google yet. Run `npm run auth` to log in.',
    );
  }
  return client;
}

export function isAuthorized(): boolean {
  return existsSync(config.google.tokenPath);
}
