import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { Dashboard, Deal, EnrichResult, Lead, Meta } from './types';

export class ApiError extends Error {
  status: number;
  needAuth: boolean;
  constructor(status: number, message: string, needAuth = false) {
    super(message);
    this.status = status;
    this.needAuth = needAuth;
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, Boolean(data?.needAuth));
  }
  return data as T;
}

// ── Raw API ───────────────────────────────────────────────────────────────--
export const api = {
  meta: () => http<Meta>('/meta'),
  deals: () => http<Deal[]>('/deals'),
  leads: () => http<Lead[]>('/leads'),
  dashboard: () => http<Dashboard>('/dashboard'),
  createDeal: (body: Partial<Deal>) =>
    http<Deal>('/deals', { method: 'POST', body: JSON.stringify(body) }),
  updateDeal: (row: number, body: Partial<Deal>) =>
    http<Deal>(`/deals/${row}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDeal: (row: number) => http<void>(`/deals/${row}`, { method: 'DELETE' }),
  createLead: (body: Partial<Lead>) =>
    http<Lead>('/leads', { method: 'POST', body: JSON.stringify(body) }),
  updateLead: (row: number, body: Partial<Lead>) =>
    http<Lead>(`/leads/${row}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteLead: (row: number) => http<void>(`/leads/${row}`, { method: 'DELETE' }),
  convertLead: (row: number, body: Record<string, unknown> = {}) =>
    http<{ deal: Deal; lead: Lead }>(`/leads/${row}/convert`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  enrich: (kind: 'lead' | 'deal', record: Deal | Lead) =>
    http<EnrichResult>('/enrich', {
      method: 'POST',
      body: JSON.stringify({ kind, record }),
    }),
};

// ── Query hooks ─────────────────────────────────────────────────────────────
const LIVE = { refetchInterval: 15_000, refetchOnWindowFocus: true } as const;

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: api.meta });
export const useDeals = () =>
  useQuery({ queryKey: ['deals'], queryFn: api.deals, ...LIVE });
export const useLeads = () =>
  useQuery({ queryKey: ['leads'], queryFn: api.leads, ...LIVE });
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, ...LIVE });

function invalidateAll(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['leads'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, body }: { row: number; body: Partial<Deal> }) =>
      api.updateDeal(row, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Deal>) => api.createDeal(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: number) => api.deleteDeal(row),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, body }: { row: number; body: Partial<Lead> }) =>
      api.updateLead(row, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Lead>) => api.createLead(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: number) => api.deleteLead(row),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, body }: { row: number; body?: Record<string, unknown> }) =>
      api.convertLead(row, body),
    onSuccess: () => invalidateAll(qc),
  });
}
