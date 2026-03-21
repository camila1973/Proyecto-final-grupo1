import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

function renderNavbar(initialLanguage: 'es' | 'en' = 'es') {
  i18n.changeLanguage(initialLanguage);
  return render(
    <LocaleProvider initialLanguage={initialLanguage}>
      <Navbar />
    </LocaleProvider>,
  );
}

describe('Navbar', () => {
  describe('branding', () => {
    it('renders the TravelHub brand name', () => {
      renderNavbar();
      expect(screen.getByText('TravelHub')).toBeInTheDocument();
    });
  });

  describe('Spanish', () => {
    beforeEach(() => renderNavbar('es'));

    it('shows the Spanish language name and currency in the trigger button', () => {
      expect(screen.getByRole('button', { name: /select language/i })).toHaveTextContent(
        `${es.nav.language} · COP`,
      );
    });

    it('renders register and login links in Spanish', () => {
      expect(screen.getByText(es.nav.register)).toBeInTheDocument();
      expect(screen.getByText(es.nav.login)).toBeInTheDocument();
    });
  });

  describe('English', () => {
    beforeEach(() => renderNavbar('en'));

    it('shows the English language name in the trigger button', () => {
      expect(screen.getByRole('button', { name: /select language/i })).toHaveTextContent(
        en.nav.language,
      );
    });

    it('renders register and login links in English', () => {
      expect(screen.getByText(en.nav.register)).toBeInTheDocument();
      expect(screen.getByText(en.nav.login)).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('is closed by default', () => {
      renderNavbar('es');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('opens when the trigger button is clicked', () => {
      renderNavbar('es');
      fireEvent.click(screen.getByRole('button', { name: /select language/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('lists all available languages', () => {
      renderNavbar('es');
      fireEvent.click(screen.getByRole('button', { name: /select language/i }));
      expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    });

    it('marks the current language as selected', () => {
      renderNavbar('es');
      fireEvent.click(screen.getByRole('button', { name: /select language/i }));
      expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-selected', 'false');
    });

    it('switches to English and closes the dropdown when English is selected', () => {
      renderNavbar('es');
      fireEvent.click(screen.getByRole('button', { name: /select language/i }));
      fireEvent.click(screen.getByRole('option', { name: 'English' }));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select language/i })).toHaveTextContent(
        en.nav.language,
      );
    });

    it('closes when clicking outside', () => {
      renderNavbar('es');
      fireEvent.click(screen.getByRole('button', { name: /select language/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
