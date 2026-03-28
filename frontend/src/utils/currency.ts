import type { Currency } from '../context/LocaleContext';

export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1,
  COP: 4200,
  EUR: 0.92,
};

export function formatPrice(usd: number, currency: Currency): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(usd * CURRENCY_RATES[currency]));
}
