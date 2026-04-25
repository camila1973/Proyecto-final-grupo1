import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';
import GuestSelector, { type GuestCounts } from './GuestSelector';

const i18n = setupTestI18n('es');

function renderSelector(props: Partial<React.ComponentProps<typeof GuestSelector>> & { onChange?: jest.Mock } = {}) {
  const onChange = props.onChange ?? jest.fn();
  return {
    onChange,
    ...render(
      <GuestSelector adults={2} children={0} onChange={onChange} {...props} />,
    ),
  };
}

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: /viajero/i }));
}

describe('GuestSelector', () => {
  describe('summary button', () => {
    it('shows singular for 1 total guest (es)', () => {
      renderSelector({ adults: 1, children: 0 });
      expect(screen.getByRole('button', { name: /^1 viajero$/i })).toBeInTheDocument();
    });

    it('shows plural for multiple guests (es)', () => {
      renderSelector({ adults: 2, children: 1 });
      expect(screen.getByRole('button', { name: /^3 viajeros$/i })).toBeInTheDocument();
    });

    it('sums adults and children in the total', () => {
      renderSelector({ adults: 3, children: 2 });
      expect(screen.getByRole('button', { name: /5 viajeros/i })).toBeInTheDocument();
    });

    it('renders in English when locale is en', () => {
      i18n.changeLanguage('en');
      renderSelector({ adults: 1, children: 0 });
      expect(screen.getByRole('button', { name: new RegExp(en.hero.guests_summary_one.replace('{{count}}', '1')) })).toBeInTheDocument();
      i18n.changeLanguage('es');
    });
  });

  describe('popover', () => {
    it('is closed by default', () => {
      renderSelector();
      expect(screen.queryByText(es.hero.guests_adults)).not.toBeInTheDocument();
      expect(screen.queryByText(es.hero.guests_children)).not.toBeInTheDocument();
    });

    it('opens when the summary button is clicked', () => {
      renderSelector();
      openPopover();
      expect(screen.getByText(es.hero.guests_adults)).toBeInTheDocument();
      expect(screen.getByText(es.hero.guests_children)).toBeInTheDocument();
    });

    it('closes when Listo button is clicked', async () => {
      renderSelector();
      openPopover();
      fireEvent.click(screen.getByRole('button', { name: es.hero.guests_done }));
      await waitFor(() => {
        expect(screen.queryByText(es.hero.guests_adults)).not.toBeInTheDocument();
      });
    });
  });

  describe('adults counter', () => {
    it('increments adults and calls onChange', () => {
      const onChange = jest.fn();
      renderSelector({ adults: 2, children: 0, onChange });
      openPopover();
      fireEvent.click(screen.getByRole('button', { name: `increase ${es.hero.guests_adults}` }));
      expect(onChange).toHaveBeenCalledWith<[GuestCounts]>({ adults: 3, children: 0 });
    });

    it('decrements adults and calls onChange', () => {
      const onChange = jest.fn();
      renderSelector({ adults: 3, children: 0, onChange });
      openPopover();
      fireEvent.click(screen.getByRole('button', { name: `decrease ${es.hero.guests_adults}` }));
      expect(onChange).toHaveBeenCalledWith<[GuestCounts]>({ adults: 2, children: 0 });
    });

    it('disables decrement button at min (1)', () => {
      renderSelector({ adults: 1 });
      openPopover();
      expect(screen.getByRole('button', { name: `decrease ${es.hero.guests_adults}` })).toBeDisabled();
    });

    it('does not disable increment button for adults', () => {
      renderSelector({ adults: 1 });
      openPopover();
      expect(screen.getByRole('button', { name: `increase ${es.hero.guests_adults}` })).not.toBeDisabled();
    });
  });

  describe('children counter', () => {
    it('increments children and calls onChange', () => {
      const onChange = jest.fn();
      renderSelector({ adults: 2, children: 0, onChange });
      openPopover();
      fireEvent.click(screen.getByRole('button', { name: `increase ${es.hero.guests_children}` }));
      expect(onChange).toHaveBeenCalledWith<[GuestCounts]>({ adults: 2, children: 1 });
    });

    it('decrements children and calls onChange', () => {
      const onChange = jest.fn();
      renderSelector({ adults: 2, children: 2, onChange });
      openPopover();
      fireEvent.click(screen.getByRole('button', { name: `decrease ${es.hero.guests_children}` }));
      expect(onChange).toHaveBeenCalledWith<[GuestCounts]>({ adults: 2, children: 1 });
    });

    it('disables decrement button at min (0)', () => {
      renderSelector({ children: 0 });
      openPopover();
      expect(screen.getByRole('button', { name: `decrease ${es.hero.guests_children}` })).toBeDisabled();
    });

    it('does not disable decrement when children > 0', () => {
      renderSelector({ children: 1 });
      openPopover();
      expect(screen.getByRole('button', { name: `decrease ${es.hero.guests_children}` })).not.toBeDisabled();
    });
  });
});
