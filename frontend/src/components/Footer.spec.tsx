import { render, screen } from '@testing-library/react';
import Footer from './Footer';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

function renderFooter() {
  return render(<Footer />);
}

describe('Footer', () => {
  describe('Spanish', () => {
    beforeEach(() => {
      i18n.changeLanguage('es');
      renderFooter();
    });

    it('renders the copyright notice', () => {
      expect(screen.getByText(es.footer.copyright)).toBeInTheDocument();
    });

    it('renders the privacy policy link', () => {
      expect(screen.getByText(es.footer.privacy)).toBeInTheDocument();
    });

    it('renders the terms link', () => {
      expect(screen.getByText(es.footer.terms)).toBeInTheDocument();
    });

    it('renders the language info', () => {
      expect(screen.getByText(es.footer.language)).toBeInTheDocument();
    });

    it('renders the currency info', () => {
      expect(screen.getByText(es.footer.currency)).toBeInTheDocument();
    });
  });

  describe('English', () => {
    beforeEach(() => {
      i18n.changeLanguage('en');
      renderFooter();
    });

    it('renders the privacy policy link in English', () => {
      expect(screen.getByText(en.footer.privacy)).toBeInTheDocument();
    });

    it('renders the terms link in English', () => {
      expect(screen.getByText(en.footer.terms)).toBeInTheDocument();
    });

    it('renders the language info in English', () => {
      expect(screen.getByText(en.footer.language)).toBeInTheDocument();
    });

    it('renders the currency info in English', () => {
      expect(screen.getByText(en.footer.currency)).toBeInTheDocument();
    });
  });
});
