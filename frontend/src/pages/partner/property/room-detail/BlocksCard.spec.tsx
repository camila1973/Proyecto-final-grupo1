import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import BlocksCard from './BlocksCard';

setupTestI18n('es');

describe('BlocksCard', () => {
  it('shows empty state when no ranges', () => {
    render(<BlocksCard ranges={[]} onNewBlock={jest.fn()} onDelete={jest.fn()} deletingRange={null} />);
    expect(screen.getByText('Sin bloqueos activos')).toBeInTheDocument();
  });

  it('renders multi-day range using arrow notation', () => {
    render(
      <BlocksCard
        ranges={[{ from: '2026-05-10', to: '2026-05-15' }]}
        onNewBlock={jest.fn()}
        onDelete={jest.fn()}
        deletingRange={null}
      />,
    );
    expect(screen.getByText('2026-05-10 → 2026-05-15')).toBeInTheDocument();
  });

  it('renders single-day range without arrow', () => {
    render(
      <BlocksCard
        ranges={[{ from: '2026-05-10', to: '2026-05-10' }]}
        onNewBlock={jest.fn()}
        onDelete={jest.fn()}
        deletingRange={null}
      />,
    );
    expect(screen.getByText('2026-05-10')).toBeInTheDocument();
  });

  it('triggers onNewBlock when the new-block button is clicked', () => {
    const onNew = jest.fn();
    render(<BlocksCard ranges={[]} onNewBlock={onNew} onDelete={jest.fn()} deletingRange={null} />);
    fireEvent.click(screen.getByText('Nuevo bloqueo'));
    expect(onNew).toHaveBeenCalled();
  });

  it('opens menu, opens delete dialog, and confirms delete', () => {
    const onDelete = jest.fn();
    const range = { from: '2026-05-10', to: '2026-05-12' };
    render(<BlocksCard ranges={[range]} onNewBlock={jest.fn()} onDelete={onDelete} deletingRange={null} />);
    const kebab = screen.getByTestId('MoreVertIcon').closest('button')!;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Quitar bloqueo'));
    fireEvent.click(screen.getByText('Quitar', { selector: 'button' }));
    expect(onDelete).toHaveBeenCalledWith(range);
  });

  it('cancels delete dialog without calling onDelete', () => {
    const onDelete = jest.fn();
    render(
      <BlocksCard
        ranges={[{ from: '2026-05-10', to: '2026-05-12' }]}
        onNewBlock={jest.fn()}
        onDelete={onDelete}
        deletingRange={null}
      />,
    );
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(screen.getByText('Quitar bloqueo'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables the kebab when this range is being deleted', () => {
    const range = { from: '2026-05-10', to: '2026-05-12' };
    render(
      <BlocksCard ranges={[range]} onNewBlock={jest.fn()} onDelete={jest.fn()} deletingRange={range} />,
    );
    const kebab = screen.getByTestId('MoreVertIcon').closest('button')!;
    expect(kebab).toBeDisabled();
  });
});
