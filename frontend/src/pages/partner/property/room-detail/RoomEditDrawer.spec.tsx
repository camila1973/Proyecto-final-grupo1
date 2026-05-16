import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import RoomEditDrawer from './RoomEditDrawer';

setupTestI18n('es');

const BASE = {
  selStart: '2026-05-10',
  selEnd: '2026-05-12',
  saving: false,
  onClose: jest.fn(),
  onApply: jest.fn(),
};

describe('RoomEditDrawer', () => {
  beforeEach(() => {
    BASE.onClose = jest.fn();
    BASE.onApply = jest.fn();
  });

  it('returns null when selStart is missing', () => {
    const { container } = render(
      <RoomEditDrawer {...BASE} mode="rate-create" selStart={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when selEnd is missing', () => {
    const { container } = render(
      <RoomEditDrawer {...BASE} mode="rate-create" selEnd={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a price field for rate-create mode', () => {
    render(<RoomEditDrawer {...BASE} mode="rate-create" />);
    expect(screen.getByPlaceholderText('ej. 350')).toBeInTheDocument();
  });

  it('disables apply when no price is set in rate-create', () => {
    render(<RoomEditDrawer {...BASE} mode="rate-create" />);
    // The apply button shows the create label.
    const buttons = screen.getAllByRole('button');
    const apply = buttons.find((b) => /aplicar/i.test(b.textContent ?? ''));
    expect(apply).toBeDefined();
    expect(apply).toBeDisabled();
  });

  it('enables apply when a positive price is entered, and calls onApply with that price', () => {
    render(<RoomEditDrawer {...BASE} mode="rate-create" />);
    fireEvent.change(screen.getByPlaceholderText('ej. 350'), { target: { value: '250' } });
    const apply = screen.getAllByRole('button').find((b) => /aplicar/i.test(b.textContent ?? ''))!;
    expect(apply).not.toBeDisabled();
    fireEvent.click(apply);
    expect(BASE.onApply).toHaveBeenCalledWith({ price: 250 });
  });

  it('does not call onApply if price is non-positive', () => {
    render(<RoomEditDrawer {...BASE} mode="rate-create" />);
    fireEvent.change(screen.getByPlaceholderText('ej. 350'), { target: { value: '-10' } });
    const apply = screen.getAllByRole('button').find((b) => /aplicar/i.test(b.textContent ?? ''))!;
    expect(apply).toBeDisabled();
  });

  it('pre-fills the price for rate-edit mode and applies', () => {
    render(<RoomEditDrawer {...BASE} mode="rate-edit" initialPrice={199} />);
    const input = screen.getByDisplayValue('199') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    const apply = screen.getAllByRole('button').find((b) => /guardar/i.test(b.textContent ?? ''))!;
    fireEvent.click(apply);
    expect(BASE.onApply).toHaveBeenCalledWith({ price: 199 });
  });

  it('does not show a price field for block-create and applies with null', () => {
    render(<RoomEditDrawer {...BASE} mode="block-create" />);
    expect(screen.queryByPlaceholderText('ej. 350')).not.toBeInTheDocument();
    const apply = screen.getAllByRole('button').find((b) => /^bloquear$/i.test((b.textContent ?? '').trim()))!;
    fireEvent.click(apply);
    expect(BASE.onApply).toHaveBeenCalledWith({ price: null });
  });

  it('calls onClose when the close icon is clicked', () => {
    render(<RoomEditDrawer {...BASE} mode="block-create" />);
    const closeBtn = screen.getAllByRole('button').find((b) => b.querySelector('[data-testid="CloseIcon"]'))!;
    fireEvent.click(closeBtn);
    expect(BASE.onClose).toHaveBeenCalled();
  });

  it('shows single-day label when start === end', () => {
    render(<RoomEditDrawer {...BASE} mode="block-create" selStart="2026-05-10" selEnd="2026-05-10" />);
    expect(screen.getByText('10 May')).toBeInTheDocument();
  });

  it('shows range arrow when start < end', () => {
    render(<RoomEditDrawer {...BASE} mode="block-create" selStart="2026-05-10" selEnd="2026-05-12" />);
    expect(screen.getByText(/10 May → 12 May/)).toBeInTheDocument();
  });
});
