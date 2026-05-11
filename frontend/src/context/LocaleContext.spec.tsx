import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import { useLocale, LocaleProvider } from './LocaleContext';

setupTestI18n('es');

function LocaleConsumer() {
  const { language, currency, setLanguage, setCurrency } = useLocale();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="currency">{currency}</span>
      <button onClick={() => setLanguage('en')}>set-en</button>
      <button onClick={() => setCurrency('USD')}>set-usd</button>
    </div>
  );
}

describe('LocaleProvider', () => {
  it('provides default language (es) and currency (COP)', () => {
    render(<LocaleProvider><LocaleConsumer /></LocaleProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('es');
    expect(screen.getByTestId('currency').textContent).toBe('COP');
  });

  it('accepts custom initialLanguage and initialCurrency', () => {
    render(<LocaleProvider initialLanguage="en" initialCurrency="USD"><LocaleConsumer /></LocaleProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('currency').textContent).toBe('USD');
  });

  it('updates language when setLanguage is called', () => {
    render(<LocaleProvider><LocaleConsumer /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'set-en' }));
    expect(screen.getByTestId('lang').textContent).toBe('en');
  });

  it('updates currency when setCurrency is called', () => {
    render(<LocaleProvider><LocaleConsumer /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'set-usd' }));
    expect(screen.getByTestId('currency').textContent).toBe('USD');
  });
});

describe('useLocale', () => {
  it('throws when rendered outside a LocaleProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<LocaleConsumer />)).toThrow('useLocale must be used within <LocaleProvider>');
    spy.mockRestore();
  });
});
