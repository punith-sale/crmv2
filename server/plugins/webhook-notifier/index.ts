import type { CrmPlugin } from '../../src/core/types.js';

/**
 * Example automation plugin. Demonstrates the plugin contract:
 *  - subscribe to domain events
 *  - register HTTP routes (mounted at /api/plugins/webhook-notifier)
 *
 * It forwards key CRM events to an outbound webhook (Slack/Zapier/n8n/…)
 * when WEBHOOK_NOTIFIER_URL is set. Inert otherwise — safe to leave enabled.
 * Use this as a template for real integrations.
 */
const plugin: CrmPlugin = {
  name: 'webhook-notifier',
  description: 'Forwards deal/lead events to an outbound webhook (set WEBHOOK_NOTIFIER_URL).',

  setup({ router, bus, config, log }) {
    const url = config.plugins.webhookNotifierUrl;
    const paused = config.plugins.notificationsPaused;

    async function post(event: string, payload: unknown) {
      if (!url || paused) return;
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event, payload, at: new Date().toISOString() }),
        });
      } catch (err) {
        log.warn(`webhook POST failed: ${(err as Error).message}`);
      }
    }

    bus.on('deal.stage_changed', (p) =>
      post('deal.stage_changed', { company: p.deal.company, from: p.from, to: p.to }),
    );
    bus.on('lead.converted', (p) =>
      post('lead.converted', { company: p.lead.company }),
    );
    bus.on('deal.created', (p) => post('deal.created', { company: p.deal.company }));

    router.get('/status', (_req, res) =>
      res.json({ enabled: Boolean(url) && !paused, paused, target: url ? 'configured' : null }),
    );

    log.info(
      paused
        ? 'Paused (NOTIFICATIONS_PAUSED) — no outbound notifications will be sent.'
        : url
          ? 'Active (webhook configured).'
          : 'Loaded but idle (no WEBHOOK_NOTIFIER_URL).',
    );
  },
};

export default plugin;
