import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import RatePlanCard from './RatePlanCard';

setupTestI18n('es');

const OVERRIDE = {
  id: 'rate-1',
  roomId: 'room-1',
  fromDate: '2026-06-01',
  toDate: '2026-06-05',
  priceUsd: 300,
  currency: 'USD',
  createdAt: '2026-05-01T00:00:00Z',
};

describe('RatePlanCard', () => {
  it('renders the base row even when there are no override rates', () => {
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[]}
        currency="USD"
        onNewRate={jest.fn()}
      />,
    );
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('renders an override row with price and range', () => {
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[OVERRIDE]}
        currency="USD"
        onNewRate={jest.fn()}
      />,
    );
    // The override price formatted by formatPrice uses USD currency.
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('fires onNewRate when "Nueva tarifa" is clicked', () => {
    const onNew = jest.fn();
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[]}
        currency="USD"
        onNewRate={onNew}
      />,
    );
    fireEvent.click(screen.getByText('Nueva tarifa'));
    expect(onNew).toHaveBeenCalled();
  });

  it('opens menu and triggers onEdit for an override row', () => {
    const onEdit = jest.fn();
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[OVERRIDE]}
        currency="USD"
        onNewRate={jest.fn()}
        onEdit={onEdit}
      />,
    );
    const kebab = screen.getByTestId('MoreVertIcon').closest('button')!;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ key: 'rate-1' }));
  });

  it('opens menu, opens delete dialog, and confirms delete', () => {
    const onDelete = jest.fn();
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[OVERRIDE]}
        currency="USD"
        onNewRate={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    // Use the menu-item "Eliminar" (the dialog also has "Eliminar")
    const items = screen.getAllByText('Eliminar');
    fireEvent.click(items[0]);
    // Now the dialog is open — click the confirm "Eliminar" button.
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent === 'Eliminar');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalledWith('rate-1');
  });

  it('cancels the delete dialog without calling onDelete', () => {
    const onDelete = jest.fn();
    render(
      <RatePlanCard
        basePriceUsd={200}
        rates={[OVERRIDE]}
        currency="USD"
        onNewRate={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(screen.getAllByText('Eliminar')[0]);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
