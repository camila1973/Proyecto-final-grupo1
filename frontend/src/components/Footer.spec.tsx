import { render, screen, fireEvent } from '@testing-library/react';
import Footer from './Footer';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

function renderFooter(initialLanguage: 'es' | 'en' = 'es', initialCurrency: 'COP' | 'USD' | 'EUR' = 'COP') {
  i18n.changeLanguage(initialLanguage);
  return render(
    <LocaleProvider initialLanguage={initialLanguage} initialCurrency={initialCurrency}>
      <Footer />
    </LocaleProvider>,
  );
}

describe('Footer', () => {
  describe('static content', () => {
    beforeEach(() => renderFooter());

    it('renders the copyright notice', () => {
      expect(screen.getByText(es.footer.copyright)).toBeInTheDocument();
    });

    it('renders the privacy policy link', () => {
      expect(screen.getByText(es.footer.privacy)).toBeInTheDocument();
    });

    it('renders the terms link', () => {
      expect(screen.getByText(es.footer.terms)).toBeInTheDocument();
    });
  });

  describe('language selector', () => {
    it('renders a language select with all options', () => {
      renderFooter('es');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.language_label, 'i') });
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: new RegExp('Español') })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: new RegExp('English') })).toBeInTheDocument();
    });

    it('has the current language pre-selected', () => {
      renderFooter('es');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.language_label, 'i') });
      expect((select as HTMLSelectElement).value).toBe('es');
    });

    it('changes language when a new option is selected', () => {
      renderFooter('es');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.language_label, 'i') });
      fireEvent.change(select, { target: { value: 'en' } });

      // UI should now show English translations
      expect(screen.getByText(en.footer.privacy)).toBeInTheDocument();
    });
  });

  describe('currency selector', () => {
    it('renders a currency select with all options', () => {
      renderFooter('es', 'COP');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.currency_label, 'i') });
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /COP/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /USD/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /EUR/ })).toBeInTheDocument();
    });

    it('has the initial currency pre-selected', () => {
      renderFooter('es', 'USD');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.currency_label, 'i') });
      expect((select as HTMLSelectElement).value).toBe('USD');
    });

    it('updates the selected currency when changed', () => {
      renderFooter('es', 'COP');
      const select = screen.getByRole('combobox', { name: new RegExp(es.footer.currency_label, 'i') });
      fireEvent.change(select, { target: { value: 'EUR' } });
      expect((select as HTMLSelectElement).value).toBe('EUR');
    });
  });

  describe('English', () => {
    beforeEach(() => renderFooter('en'));

    it('renders labels in English', () => {
      expect(screen.getByRole('combobox', { name: new RegExp(en.footer.language_label, 'i') })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: new RegExp(en.footer.currency_label, 'i') })).toBeInTheDocument();
    });

    it('renders links in English', () => {
      expect(screen.getByText(en.footer.privacy)).toBeInTheDocument();
      expect(screen.getByText(en.footer.terms)).toBeInTheDocument();
    });
  });
});
