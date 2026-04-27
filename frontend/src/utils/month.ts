const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return currentMonth();
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

export function formatMonthLabel(month: string, lang: 'es' | 'en'): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return month;
  const names = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ES;
  return `${names[m - 1]} ${y}`;
}

export function shortMonthLabel(month: string, lang: 'es' | 'en'): string {
  const mStr = month.split('-')[1];
  const m = Number(mStr);
  if (!m) return month;
  const names = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ES;
  return names[m - 1].slice(0, 3);
}
