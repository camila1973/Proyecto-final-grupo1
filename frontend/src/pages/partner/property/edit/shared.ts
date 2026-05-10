import type { InventoryProperty, UpdatePropertyBody } from '../../../../utils/queries';

export type TabId = 'info' | 'tax' | 'fees' | 'media' | 'qr';

export const TAB_IDS: readonly TabId[] = ['info', 'tax', 'fees', 'media', 'qr'] as const;

export const COUNTRY_OPTIONS = [
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
];

export const CURRENCY_OPTIONS = ['MXN', 'COP', 'USD', 'EUR', 'ARS'];

export const TIMEZONE_OPTIONS = [
  'America/Cancun',
  'America/Mexico_City',
  'America/Bogota',
  'Europe/Madrid',
  'America/Argentina/Buenos_Aires',
];

export interface FormState {
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  countryCode: string;
  city: string;
  currency: string;
  timezone: string;
  description: string;
}

export function fromProperty(p: InventoryProperty): FormState {
  return {
    name: p.name ?? '',
    type: p.type ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    countryCode: p.countryCode ?? '',
    city: p.city ?? '',
    currency: p.currency ?? '',
    timezone: p.timezone ?? '',
    description: p.description ?? '',
  };
}

export function toBody(f: FormState): UpdatePropertyBody {
  const trim = (v: string) => v.trim();
  const orNull = (v: string) => (trim(v) ? trim(v) : null);
  return {
    name: trim(f.name),
    type: trim(f.type),
    countryCode: trim(f.countryCode),
    city: trim(f.city),
    phone: orNull(f.phone),
    email: orNull(f.email),
    address: orNull(f.address),
    currency: orNull(f.currency),
    timezone: orNull(f.timezone),
    description: orNull(f.description),
  };
}
