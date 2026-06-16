import type { Router } from 'express';
import type { Bus } from './events.js';
import type { Logger } from './logger.js';
import type { AppConfig } from '../config.js';
import * as repository from '../sheets/repository.js';

/**
 * Everything a plugin is handed at setup time. This is the public surface for
 * future automations/integrations — keep it stable.
 */
export interface PluginContext {
  /** Router mounted at /api/plugins/<name> — register custom endpoints here. */
  router: Router;
  /** Subscribe to domain events (deal.updated, lead.converted, …). */
  bus: Bus;
  /** Read/write CRM data (getRecords, updateRecord, createRecord, …). */
  repo: typeof repository;
  config: AppConfig;
  log: Logger;
}

export interface CrmPlugin {
  name: string;
  description?: string;
  /** Called once at startup. Wire up listeners and routes here. */
  setup(ctx: PluginContext): void | Promise<void>;
}

export interface PluginInfo {
  name: string;
  description?: string;
  routeBase: string;
}
