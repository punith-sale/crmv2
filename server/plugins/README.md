# Plugins

Drop-in automations and integrations. Each subdirectory with an `index.ts`
(or `index.js`) that default-exports a `CrmPlugin` is loaded automatically at
startup. This is the seam for future integrations — no core changes needed.

## Anatomy

```ts
import type { CrmPlugin } from '../../src/core/types.js';

const plugin: CrmPlugin = {
  name: 'my-plugin',
  description: 'What it does.',
  setup({ router, bus, repo, config, log }) {
    // 1) React to domain events
    bus.on('deal.stage_changed', ({ deal, from, to }) => {
      log.info(`${deal.company}: ${from} → ${to}`);
    });

    // 2) Add HTTP endpoints (mounted at /api/plugins/my-plugin)
    router.get('/ping', (_req, res) => res.json({ pong: true }));

    // 3) Read/write CRM data
    // const deals = await repo.getRecords('deals');
  },
};

export default plugin;
```

## Context API (`setup({ ... })`)

| Field    | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| `router` | Express router mounted at `/api/plugins/<dir-name>`.                    |
| `bus`    | Typed event bus — `bus.on(event, handler)`.                            |
| `repo`   | Data access: `getRecords`, `updateRecord`, `createRecord`, `convertLeadToDeal`, … |
| `config` | App config (env, spreadsheet id, plugin settings).                     |
| `log`    | Scoped logger.                                                         |

## Events

`deal.created`, `deal.updated`, `deal.stage_changed`, `deal.deleted`,
`lead.created`, `lead.updated`, `lead.deleted`, `lead.converted`,
`record.enriched`.

## Enabling / disabling

By default every plugin directory is loaded. To load only specific ones, set
`ENABLED_PLUGINS=name1,name2` in `.env`.

## Ideas

- **slack-notifier** — post to Slack on `deal.stage_changed` / `lead.converted`.
- **daily-digest** — cron a "needs attention" summary email.
- **auto-enrich** — on `lead.created`, queue a Claude enrichment run.
- **calendar-sync** — create calendar events from a deal's `Due` date.
