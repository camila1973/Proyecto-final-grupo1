import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../i18n/test-utils';
import { AuthContext } from '../../context/auth-context';
import TeamBody from './team';

setupTestI18n('es');

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'u1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderBody(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue as never}>
        <TeamBody />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TeamBody', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows login alert when unauthenticated', () => {
    renderBody({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders MembersSection when authenticated', async () => {
    renderBody();
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });
  });
});
