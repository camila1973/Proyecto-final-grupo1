import { render, screen } from '@testing-library/react';
import MetricCard from './MetricCard';

describe('MetricCard', () => {
  it('renders value and uppercased label', () => {
    render(<MetricCard label="confirmados" value="1" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMADOS')).toBeInTheDocument();
  });

  it('uses positive variant color by default value', () => {
    render(<MetricCard label="ingresos" value="1.000" variant="positive" testId="m1" />);
    const value = screen.getByText('1.000');
    expect(value).toHaveStyle({ color: '#27ae60' });
    expect(screen.getByTestId('m1')).toBeInTheDocument();
  });

  it('uses negative variant color', () => {
    render(<MetricCard label="pérdidas" value="500" variant="negative" />);
    expect(screen.getByText('500')).toHaveStyle({ color: '#e74c3c' });
  });
});
