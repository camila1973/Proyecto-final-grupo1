import { render, screen } from '@testing-library/react';
import App from './App';
import { setupTestI18n } from './i18n/test-utils';
import es from './i18n/locales/es.json';
import en from './i18n/locales/en.json';

const i18n = setupTestI18n('es');

describe('App (integration)', () => {
  it('renders all four main sections in Spanish', async () => {
    i18n.changeLanguage('es');
    render(<App />);

    expect(await screen.findByText('TravelHub')).toBeInTheDocument();
    expect(screen.getByText(es.hero.title)).toBeInTheDocument();
    expect(screen.getByText(es.recommendations.title)).toBeInTheDocument();
    expect(screen.getByText(es.footer.copyright)).toBeInTheDocument();
  });

  it('renders all four main sections in English', async () => {
    i18n.changeLanguage('en');
    render(<App />);

    expect(await screen.findByText('TravelHub')).toBeInTheDocument();
    expect(screen.getByText(en.hero.title)).toBeInTheDocument();
    expect(screen.getByText(en.recommendations.title)).toBeInTheDocument();
    expect(screen.getByText(en.footer.copyright)).toBeInTheDocument();
  });

  it('renders 3 hotel cards', async () => {
    i18n.changeLanguage('es');
    render(<App />);

    const cards = await screen.findAllByText('HOTEL NORTH PARK');
    expect(cards).toHaveLength(3);
  });
});
