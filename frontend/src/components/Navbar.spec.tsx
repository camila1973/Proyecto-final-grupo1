import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

function renderNavbar() {
  return render(<Navbar />);
}

describe('Navbar', () => {
  describe('branding', () => {
    beforeEach(() => {
      i18n.changeLanguage('es');
      renderNavbar();
    });

    it('renders the TravelHub brand name', () => {
      expect(screen.getByText('TravelHub')).toBeInTheDocument();
    });

    it('renders the TravelHub logo SVG', () => {
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Spanish', () => {
    beforeEach(() => {
      i18n.changeLanguage('es');
      renderNavbar();
    });

    it('renders the language selector in Spanish', () => {
      expect(screen.getByText(es.nav.language)).toBeInTheDocument();
    });

    it('renders the register link', () => {
      expect(screen.getByText(es.nav.register)).toBeInTheDocument();
    });

    it('renders the login link', () => {
      expect(screen.getByText(es.nav.login)).toBeInTheDocument();
    });
  });

  describe('English', () => {
    beforeEach(() => {
      i18n.changeLanguage('en');
      renderNavbar();
    });

    it('renders the language selector in English', () => {
      expect(screen.getByText(en.nav.language)).toBeInTheDocument();
    });

    it('renders the register link in English', () => {
      expect(screen.getByText(en.nav.register)).toBeInTheDocument();
    });

    it('renders the login link in English', () => {
      expect(screen.getByText(en.nav.login)).toBeInTheDocument();
    });
  });

  describe('language toggle', () => {
    it('switches from Spanish to English on click', () => {
      i18n.changeLanguage('es');
      renderNavbar();

      fireEvent.click(screen.getByRole('button', { name: /toggle language/i }));

      expect(screen.getByText(en.nav.language)).toBeInTheDocument();
    });

    it('switches from English back to Spanish on click', () => {
      i18n.changeLanguage('en');
      renderNavbar();

      fireEvent.click(screen.getByRole('button', { name: /toggle language/i }));

      expect(screen.getByText(es.nav.language)).toBeInTheDocument();
    });
  });
});
