import { EventEmitter } from 'node:events';
import type { SheetRecord } from '../domain/crm.js';

/**
 * Typed application event bus. Core code emits domain events; plugins
 * subscribe to them. This is the seam that lets future automations and
 * integrations react to CRM changes without modifying core code.
 */
export interface CrmEvents {
  'deal.created': { deal: SheetRecord };
  'deal.updated': { deal: SheetRecord; changes: Record<string, unknown> };
  'deal.stage_changed': { deal: SheetRecord; from: string | null; to: string };
  'deal.deleted': { row: number; company: string };
  'lead.created': { lead: SheetRecord };
  'lead.updated': { lead: SheetRecord; changes: Record<string, unknown> };
  'lead.deleted': { row: number; company: string };
  'lead.converted': { lead: SheetRecord; deal: SheetRecord };
  'record.enriched': { kind: 'lead' | 'deal'; company: string; suggestions: Record<string, unknown> };
}

export type CrmEventName = keyof CrmEvents;

class TypedBus {
  private emitter = new EventEmitter();

  constructor() {
    // Never let a buggy plugin listener crash the server.
    this.emitter.on('error', () => {});
    this.emitter.setMaxListeners(50);
  }

  on<E extends CrmEventName>(event: E, handler: (payload: CrmEvents[E]) => void): void {
    this.emitter.on(event, (payload) => {
      try {
        handler(payload as CrmEvents[E]);
      } catch (err) {
        console.error(`[events] listener for "${event}" threw:`, err);
      }
    });
  }

  emit<E extends CrmEventName>(event: E, payload: CrmEvents[E]): void {
    this.emitter.emit(event, payload);
  }
}

export const bus = new TypedBus();
export type Bus = TypedBus;
