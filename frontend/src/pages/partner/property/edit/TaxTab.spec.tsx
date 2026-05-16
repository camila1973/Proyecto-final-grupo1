import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import TaxTab from './TaxTab';
import type { TaxRule } from '../../../../utils/queries';

setupTestI18n('es');

const RULE_PCT: TaxRule = {
  id: 't1',
  country: 'CO',
  city: 'Bogotá',
  tax_name: 'IVA',
  tax_type: 'PERCENTAGE',
  rate: '19',
  flat_amount: null,
  currency: 'COP',
  applies_to: 'room',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
};

const RULE_FLAT: TaxRule = {
  id: 't2',
  country: 'CO',
  city: null,
  tax_name: 'Tasa nacional',
  tax_type: 'FLAT_PER_NIGHT',
  rate: null,
  flat_amount: '5000',
  currency: 'COP',
  applies_to: 'room',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: false,
};

const BASE = {
  country: 'CO',
  countryLabel: 'Colombia',
  city: 'Bogotá',
};

describe('TaxTab', () => {
  it('shows loading spinner', () => {
    render(<TaxTab {...BASE} rules={[]} isLoading isError={false} />);
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows the error alert', () => {
    render(<TaxTab {...BASE} rules={[]} isLoading={false} isError />);
    expect(screen.getByText('No se pudieron cargar las reglas de impuesto.')).toBeInTheDocument();
  });

  it('shows the no-rules empty state when there are no rules', () => {
    render(<TaxTab {...BASE} rules={[]} isLoading={false} isError={false} />);
    expect(screen.getByText(/Sin reglas configuradas/)).toBeInTheDocument();
  });

  it('renders a percentage rule with its rate', () => {
    render(<TaxTab {...BASE} rules={[RULE_PCT]} isLoading={false} isError={false} />);
    expect(screen.getByText('IVA')).toBeInTheDocument();
    // Two "19.00%": the row's rate cell, and the kpi block's effective tax.
    expect(screen.getAllByText('19.00%').length).toBeGreaterThan(0);
  });

  it('renders a flat rule with its flat amount and "Todas" city label when city is null', () => {
    render(<TaxTab {...BASE} rules={[RULE_FLAT]} isLoading={false} isError={false} />);
    expect(screen.getByText('Tasa nacional')).toBeInTheDocument();
    expect(screen.getByText('$ 5000.00')).toBeInTheDocument();
    expect(screen.getByText('Todas')).toBeInTheDocument();
  });

  it('computes the effective rate KPI from active percentage rules only', () => {
    const r2: TaxRule = { ...RULE_PCT, id: 't3', rate: '5' };
    render(<TaxTab {...BASE} rules={[RULE_PCT, r2]} isLoading={false} isError={false} />);
    expect(screen.getByText('24.00%')).toBeInTheDocument();
  });

  it('filters out rules from other cities', () => {
    const otherCity: TaxRule = { ...RULE_PCT, id: 't4', city: 'Medellín' };
    render(<TaxTab {...BASE} rules={[otherCity]} isLoading={false} isError={false} />);
    // The Medellín rule should be hidden; we land on the empty state.
    expect(screen.getByText(/Sin reglas configuradas/)).toBeInTheDocument();
  });
});
