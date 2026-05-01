import type { Currency } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';

type Translate = (key: string) => string;

export function buildTooltipFormatter(t: Translate, currency: Currency) {
  return (value: unknown, name: unknown): [string, string] => {
    const numeric = Number(value);
    const key = String(name);
    if (key === 'occupancy') return [`${numeric}%`, t('partner.dashboard.legend_occupancy')];
    const label = key === 'revenue'
      ? t('partner.dashboard.legend_revenue')
      : t('partner.dashboard.legend_losses');
    return [formatPrice(numeric, currency), label];
  };
}

export function buildLegendFormatter(t: Translate) {
  return (name: unknown): string => {
    const key = String(name);
    if (key === 'revenue') return t('partner.dashboard.legend_revenue');
    if (key === 'losses') return t('partner.dashboard.legend_losses');
    return t('partner.dashboard.legend_occupancy');
  };
}
