import { API_BASE } from '../../env';
import type { TaxonomyCategory, TaxonomyResponse, LabelMap } from './types';

export const COP_RATE = 4200;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function offsetDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatCOP(usd: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(usd * COP_RATE));
}

export function getNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function resolveLabel(map: LabelMap, code: string): string {
  return map[code] ?? code;
}

export function buildLabelMap(categories: TaxonomyCategory[], categoryCode: string): LabelMap {
  const cat = categories.find((c) => c.code === categoryCode);
  if (!cat) return {};
  return Object.fromEntries(cat.values.map((v) => [v.code, v.label]));
}

export async function fetchTaxonomies(): Promise<TaxonomyResponse> {
  const res = await fetch(`${API_BASE}/api/search/taxonomies`);
  if (!res.ok) throw new Error('Failed to fetch taxonomies');
  return res.json();
}
