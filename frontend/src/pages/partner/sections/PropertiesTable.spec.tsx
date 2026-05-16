import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import PropertiesSection from './PropertiesTable';

setupTestI18n('es');

const ROWS = [
  {
    propertyId: 'prop-abcdef12',
    propertyName: 'Hotel Alpha',
    loading: false,
    confirmed: 5,
    gross: 10000,
    managerName: 'Carlos Ruiz',
  },
  {
    propertyId: 'prop-xyz12345',
    propertyName: 'Hotel Beta',
    loading: true,
    confirmed: 0,
    gross: 0,
    managerName: null,
  },
];

describe('PropertiesSection', () => {
  it('renders all property rows', () => {
    render(<PropertiesSection rows={ROWS} currency="USD" onView={jest.fn()} />);
    expect(screen.getByText('Hotel Alpha')).toBeInTheDocument();
    expect(screen.getByText('Hotel Beta')).toBeInTheDocument();
  });

  it('shows the manager name when set, and an "Sin gerente" label otherwise', () => {
    render(<PropertiesSection rows={ROWS} currency="USD" onView={jest.fn()} />);
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Sin gerente')).toBeInTheDocument();
  });

  it('shows em-dash on rows whose metrics are loading', () => {
    render(<PropertiesSection rows={ROWS} currency="USD" onView={jest.fn()} />);
    // Two cells render "—" for the loading row (gross + net).
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onView when the property name is clicked', () => {
    const onView = jest.fn();
    render(<PropertiesSection rows={ROWS} currency="USD" onView={onView} />);
    fireEvent.click(screen.getByText('Hotel Alpha'));
    expect(onView).toHaveBeenCalledWith('prop-abcdef12');
  });

  it('shows the empty state when no rows', () => {
    render(<PropertiesSection rows={[]} currency="USD" onView={jest.fn()} />);
    expect(screen.getByText('No hay propiedades registradas.')).toBeInTheDocument();
  });

  it('opens the row menu when the kebab is clicked', () => {
    render(<PropertiesSection rows={ROWS} currency="USD" onView={jest.fn()} />);
    const kebab = screen.getAllByTestId('MoreVertIcon')[0].closest('button')!;
    fireEvent.click(kebab);
    expect(screen.getByText(/asignar gerente/i)).toBeInTheDocument();
  });

  it('clicking the truncated id triggers a clipboard write', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    render(<PropertiesSection rows={ROWS} currency="USD" onView={jest.fn()} />);
    fireEvent.click(screen.getByText('prop-abc'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('prop-abcdef12');
  });
});
