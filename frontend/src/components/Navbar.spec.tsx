import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory, createRouter, createRootRoute, RouterProvider } from '@tanstack/react-router';
import Navbar from './Navbar';
import { LocaleProvider } from '../context/LocaleContext';
import { AuthProvider } from '../context/AuthContext';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

function renderNavbar(initialLanguage: 'es' | 'en' = 'es') {
  i18n.changeLanguage(initialLanguage);
  const rootRoute = createRootRoute({
    component: () => (
      <AuthProvider>
        <LocaleProvider initialLanguage={initialLanguage}>
          <Navbar />
        </LocaleProvider>
      </AuthProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('Navbar', () => {
  describe('branding', () => {
    it('renders the TravelHub brand name', async () => {
      renderNavbar();
      expect(await screen.findByRole('img', { name: 'TravelHub' })).toBeInTheDocument();
    });
  });

  describe('Spanish', () => {
    it('shows the Spanish language name and currency in the trigger button', async () => {
      renderNavbar('es');
      const btn = await screen.findByRole('button', { name: /select language/i });
      expect(btn).toHaveTextContent(es.nav.language);
      expect(btn).toHaveTextContent('COP');
    });

    it('renders register and login links in Spanish', async () => {
      renderNavbar('es');
      expect(await screen.findByText(es.nav.register)).toBeInTheDocument();
      expect(screen.getByText(es.nav.login)).toBeInTheDocument();
    });
  });

  describe('English', () => {
    it('shows the English language name in the trigger button', async () => {
      renderNavbar('en');
      expect(await screen.findByRole('button', { name: /select language/i })).toHaveTextContent(
        en.nav.language,
      );
    });

    it('renders register and login links in English', async () => {
      renderNavbar('en');
      expect(await screen.findByText(en.nav.register)).toBeInTheDocument();
      expect(screen.getByText(en.nav.login)).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('is closed by default', async () => {
      renderNavbar('es');
      await screen.findByRole('img', { name: 'TravelHub' });
      expect(screen.queryByRole('button', { name: 'Español' })).not.toBeInTheDocument();
    });

    it('opens when the trigger button is clicked', async () => {
      renderNavbar('es');
      fireEvent.click(await screen.findByRole('button', { name: /select language/i }));
      expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
    });

    it('lists all available languages', async () => {
      renderNavbar('es');
      fireEvent.click(await screen.findByRole('button', { name: /select language/i }));
      expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    });

    it('marks the current language as selected', async () => {
      renderNavbar('es');
      fireEvent.click(await screen.findByRole('button', { name: /select language/i }));
      expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches to English when English is selected', async () => {
      renderNavbar('es');
      fireEvent.click(await screen.findByRole('button', { name: /select language/i }));
      fireEvent.click(screen.getByRole('button', { name: 'English' }));

      expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('closes when the Done button is clicked', async () => {
      renderNavbar('es');
      fireEvent.click(await screen.findByRole('button', { name: /select language/i }));
      expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
      expect(screen.queryByRole('button', { name: 'Español' })).not.toBeInTheDocument();
    });
  });
});
