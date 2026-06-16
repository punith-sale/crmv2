import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express, { type Express } from 'express';
import { bus } from './events.js';
import { createLogger } from './logger.js';
import { config } from '../config.js';
import * as repository from '../sheets/repository.js';
import type { CrmPlugin, PluginInfo } from './types.js';

const log = createLogger('plugins');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '..', '..', 'plugins');

async function loadPluginModule(dir: string): Promise<CrmPlugin | null> {
  for (const entry of ['index.ts', 'index.js']) {
    const file = path.join(dir, entry);
    try {
      await fs.access(file);
    } catch {
      continue;
    }
    const mod = await import(pathToFileURL(file).href);
    const plugin: CrmPlugin = mod.default ?? mod.plugin;
    if (plugin && typeof plugin.setup === 'function') return plugin;
    log.warn(`Plugin in ${dir} has no valid default export; skipping.`);
    return null;
  }
  return null;
}

/**
 * Discover and initialize plugins from server/plugins/*. Each gets its own
 * router mounted at /api/plugins/<name>. Returns metadata for the UI.
 */
export async function loadPlugins(app: Express): Promise<PluginInfo[]> {
  const loaded: PluginInfo[] = [];
  let dirs: string[] = [];
  try {
    const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    log.info('No plugins directory; skipping plugin load.');
    return loaded;
  }

  const allowList = config.plugins.enabled;
  for (const name of dirs) {
    if (allowList.length > 0 && !allowList.includes(name)) continue;
    try {
      const plugin = await loadPluginModule(path.join(PLUGINS_DIR, name));
      if (!plugin) continue;
      const router = express.Router();
      const routeBase = `/api/plugins/${name}`;
      await plugin.setup({ router, bus, repo: repository, config, log: createLogger(`plugin:${name}`) });
      app.use(routeBase, router);
      loaded.push({ name: plugin.name, description: plugin.description, routeBase });
      log.info(`Loaded plugin "${plugin.name}" → ${routeBase}`);
    } catch (err) {
      log.error(`Failed to load plugin "${name}":`, (err as Error).message);
    }
  }
  return loaded;
}
