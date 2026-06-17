import express, { type Request, type Response, type NextFunction } from 'express';
import { AuthRequiredError, isAuthorized } from '../auth/googleAuth.js';
import { config } from '../config.js';
import { bus } from '../core/events.js';
import { createLogger } from '../core/logger.js';
import { computeDashboard } from '../domain/dashboard.js';
import {
  ACTIVITY_TYPES,
  ASSUMPTIONS,
  DEAL_FIELDS,
  ICP_SEGMENTS,
  LEAD_FIELDS,
  LEAD_STATUSES,
  OWNERS,
  STAGES,
  stageDef,
} from '../domain/crm.js';
import * as repo from '../sheets/repository.js';
import { resolveTab } from '../sheets/client.js';
import { buildEnrichmentPrompt } from '../enrichment/prompt.js';
import { runEnrichment } from '../enrichment/claudeRunner.js';
import type { PluginInfo } from '../core/types.js';

const log = createLogger('api');

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export function createApiRouter(getPlugins: () => PluginInfo[]) {
  const r = express.Router();

  // ── Meta / config ─────────────────────────────────────────────────────────
  r.get(
    '/meta',
    wrap(async (_req, res) => {
      const realAuth = isAuthorized();
      const authorized = realAuth || config.demo;
      let tabs: { deals?: string; leads?: string } = {};
      if (realAuth) {
        try {
          const [d, l] = await Promise.all([resolveTab('deals'), resolveTab('leads')]);
          tabs = { deals: d.title, leads: l.title };
        } catch (e) {
          log.warn('Tab resolution failed:', (e as Error).message);
        }
      }
      res.json({
        authorized,
        demo: config.demo,
        tabs,
        plugins: getPlugins(),
        config: {
          stages: STAGES,
          leadStatuses: LEAD_STATUSES,
          icpSegments: ICP_SEGMENTS,
          owners: OWNERS,
          activityTypes: ACTIVITY_TYPES,
          assumptions: ASSUMPTIONS,
          dealFields: DEAL_FIELDS,
          leadFields: LEAD_FIELDS,
        },
      });
    }),
  );

  // ── Deals ───────────────────────────────────────────────────────────────--
  r.get('/deals', wrap(async (_req, res) => res.json(await repo.getRecords('deals'))));

  r.post(
    '/deals',
    wrap(async (req, res) => {
      const values = { ...req.body };
      const def = stageDef(values.stage);
      if (def) {
        values.probability ??= def.probability;
        values.forecastCategory ??= def.forecast;
      }
      const deal = await repo.createRecord('deals', values);
      bus.emit('deal.created', { deal });
      res.status(201).json(deal);
    }),
  );

  r.patch(
    '/deals/:row',
    wrap(async (req, res) => {
      const row = Number(req.params.row);
      const changes = { ...req.body };
      delete changes._row;

      // Find previous stage to detect transitions.
      const before = (await repo.getRecords('deals')).find((d) => d._row === row);
      const fromStage = (before?.stage as string) ?? null;

      // Auto-sync probability/forecast when the stage changes.
      if (changes.stage && changes.stage !== fromStage) {
        const def = stageDef(changes.stage);
        if (def) {
          if (changes.probability === undefined) changes.probability = def.probability;
          if (changes.forecastCategory === undefined) changes.forecastCategory = def.forecast;
        }
      }

      const deal = await repo.updateRecord('deals', row, changes);
      bus.emit('deal.updated', { deal, changes });
      if (changes.stage && changes.stage !== fromStage) {
        bus.emit('deal.stage_changed', { deal, from: fromStage, to: changes.stage });
      }
      res.json(deal);
    }),
  );

  r.delete(
    '/deals/:row',
    wrap(async (req, res) => {
      const row = Number(req.params.row);
      const before = (await repo.getRecords('deals')).find((d) => d._row === row);
      await repo.deleteRecord('deals', row);
      bus.emit('deal.deleted', { row, company: String(before?.company ?? '') });
      res.status(204).end();
    }),
  );

  // ── Leads ───────────────────────────────────────────────────────────────--
  r.get('/leads', wrap(async (_req, res) => res.json(await repo.getRecords('leads'))));

  r.post(
    '/leads',
    wrap(async (req, res) => {
      const values = { ...req.body };
      values.leadStatus ??= 'New';
      const lead = await repo.createRecord('leads', values);
      bus.emit('lead.created', { lead });
      res.status(201).json(lead);
    }),
  );

  r.patch(
    '/leads/:row',
    wrap(async (req, res) => {
      const row = Number(req.params.row);
      const changes = { ...req.body };
      delete changes._row;
      const lead = await repo.updateRecord('leads', row, changes);
      bus.emit('lead.updated', { lead, changes });
      res.json(lead);
    }),
  );

  r.delete(
    '/leads/:row',
    wrap(async (req, res) => {
      const row = Number(req.params.row);
      const before = (await repo.getRecords('leads')).find((d) => d._row === row);
      await repo.deleteRecord('leads', row);
      bus.emit('lead.deleted', { row, company: String(before?.company ?? '') });
      res.status(204).end();
    }),
  );

  r.post(
    '/leads/:row/convert',
    wrap(async (req, res) => {
      const row = Number(req.params.row);
      const { deal, lead } = await repo.convertLeadToDeal(row, req.body ?? {});
      bus.emit('lead.converted', { lead, deal });
      res.status(201).json({ deal, lead });
    }),
  );

  // ── Dashboard ───────────────────────────────────────────────────────────--
  r.get(
    '/dashboard',
    wrap(async (_req, res) => {
      const [deals, leads] = await Promise.all([
        repo.getRecords('deals'),
        repo.getRecords('leads'),
      ]);
      res.json(computeDashboard(deals, leads));
    }),
  );

  // ── Enrichment (Claude CLI) ──────────────────────────────────────────────-
  r.post(
    '/enrich',
    wrap(async (req, res) => {
      const kind: 'lead' | 'deal' = req.body?.kind === 'deal' ? 'deal' : 'lead';
      const record = req.body?.record ?? {};
      const prompt = buildEnrichmentPrompt(kind, record);
      const result = await runEnrichment(prompt);
      bus.emit('record.enriched', {
        kind,
        company: String(record.company ?? ''),
        suggestions: result.fields,
      });
      res.json(result);
    }),
  );

  // ── Plugins listing ───────────────────────────────────────────────────────
  r.get('/plugins', (_req, res) => res.json(getPlugins()));

  return r;
}

export function apiErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AuthRequiredError) {
    return res.status(428).json({ error: err.message, needAuth: true });
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  log.error(message);
  res.status(500).json({ error: message });
}
