import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../../i18n/test-utils';
import { AuthContext } from '../../../../context/auth-context';
import QrTab from './QrTab';

setupTestI18n('es');

jest.mock('qrcode.react', () => ({ QRCodeSVG: () => null }));

const QR_DATA = {
  partnerId: 'partner-1',
  propertyId: 'prop-abc',
  checkInKey: 'abc123',
  createdAt: '2026-05-10T00:00:00Z',
};

const PROPERTY = {
  propertyId: 'prop-abc',
  propertyName: 'Hotel Test',
  propertyCity: 'Bogotá',
  propertyNeighborhood: null,
  propertyCountryCode: 'CO',
  propertyThumbnailUrl: null,
  roomCount: 5,
  reservationCount: 0,
};

const MOCK_AUTH = {
  token: 'tok',
  user: { id: 'u', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderTab(qrOk = true) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('checkin-publickey')) {
      if (!qrOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(QR_DATA) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTY) });
  }) as never;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={MOCK_AUTH as never}>
        <QrTab propertyId="prop-abc" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('QrTab', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the QR preview block once data loads', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText(/Hotel Test/)).toBeInTheDocument());
  });

  it('shows an error alert when the QR fetch fails', async () => {
    renderTab(false);
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar el código QR. Inténtalo más tarde.')).toBeInTheDocument();
    });
  });

  it('opens and closes the regenerate-confirmation dialog', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText(/Hotel Test/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /regenerar/i }));
    expect(await screen.findByText(/¿Regenerar.*código/i)).toBeInTheDocument();
    // Cancel via the cancel button inside the dialog.
    fireEvent.click(screen.getAllByRole('button', { name: /cancelar/i })[0]);
    await waitFor(() => {
      expect(screen.queryByText(/¿Regenerar.*código/i)).not.toBeInTheDocument();
    });
  });
});
