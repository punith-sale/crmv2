import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config, REPO_ROOT } from './config.js';
import { createLogger } from './core/logger.js';
import { createApiRouter, apiErrorHandler } from './routes/api.js';
import { loadPlugins } from './core/pluginManager.js';
import { isAuthorized } from './auth/googleAuth.js';
import type { PluginInfo } from './core/types.js';

const log = createLogger('server');
const WEB_DIST = path.resolve(REPO_ROOT, 'web', 'dist');

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, authorized: isAuthorized() }),
  );

  // Core API.
  let plugins: PluginInfo[] = [];
  app.use('/api', createApiRouter(() => plugins));

  // Plugins (mount their routers at /api/plugins/<name>).
  plugins = await loadPlugins(app);

  // API error handler (must come after API + plugin routes).
  app.use('/api', apiErrorHandler);

  // Serve the built SPA in production; fall through to index.html for routing.
  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
    log.info(`Serving web build from ${WEB_DIST}`);
  } else {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res
        .status(200)
        .send(
          'API is running. In development, open the Vite dev server (npm run dev → http://localhost:5173). ' +
            'For production, run `npm run build` first.',
        );
    });
  }

  app.listen(config.port, () => {
    log.info(`Origin CRM API on http://localhost:${config.port}`);
    if (!isAuthorized()) {
      log.warn('Not authorized with Google yet — run `npm run auth` to connect your sheet.');
    }
  });
}

main().catch((err) => {
  log.error('Fatal startup error:', err);
  process.exit(1);
});
