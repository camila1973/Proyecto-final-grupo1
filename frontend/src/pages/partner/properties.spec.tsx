import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../i18n/test-utils';
import { LocaleProvider } from '../../context/LocaleContext';
import { AuthContext } from '../../context/auth-context';
import PropertiesBody from './properties';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const PROPS_RESPONSE = {
  partnerId: 'partner-1',
  properties: [
    {
      propertyId: 'prop-abc-1',
      propertyName: 'Hotel Alpha',
      propertyCity: 'Bogotá',
      propertyNeighborhood: null,
      propertyCountryCode: 'CO',
      propertyThumbnailUrl: null,
      roomCount: 5,
      reservationCount: 10,
    },
  ],
};

const MEMBERS_RESPONSE = [
  {
    id: 'm1',
    userId: 'u1',
    email: 'mgr@hotel.com',
    firstName: 'Pat',
    lastName: 'Manager',
    role: 'manager',
    propertyId: 'prop-abc-1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: null,
  },
];

const METRICS_RESPONSE = {
  partnerId: 'partner-1',
  propertyId: 'prop-abc-1',
  month: '2026-05',
  roomType: null,
  metrics: { confirmed: 3, cancelled: 0, revenueUsd: 5000, lossesUsd: 0, netUsd: 4000 },
  monthlySeries: [],
};

const MOCK_AUTH = {
  token: 'tok',
  user: { id: 'u1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderBody(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PropertiesBody />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PropertiesBody', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/members')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MEMBERS_RESPONSE) });
      }
      if (url.includes('/properties/') && url.includes('/metrics')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
      }
      if (url.endsWith('/properties') || url.includes('/properties?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPS_RESPONSE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it('shows login required when unauthenticated', () => {
    renderBody({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the property list with manager name resolved', async () => {
    renderBody();
    await waitFor(() => expect(screen.getByText('Hotel Alpha')).toBeInTheDocument());
    expect(screen.getByText('Pat Manager')).toBeInTheDocument();
  });
});
