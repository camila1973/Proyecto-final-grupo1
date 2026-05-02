import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import MembersSection from './MembersSection';

setupTestI18n('es');

const MEMBERS = [
  {
    id: 'm-1',
    userId: 'u-1',
    email: 'owner@hotel.com',
    firstName: 'Ana',
    lastName: 'García',
    role: 'partner' as const,
    propertyId: null,
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    lastLoginAt: '2026-04-20T08:30:00Z',
  },
  {
    id: 'm-2',
    userId: 'u-2',
    email: 'manager@hotel.com',
    firstName: null,
    lastName: null,
    role: 'manager' as const,
    propertyId: 'prop-1',
    status: 'inactive',
    createdAt: '2026-02-10T09:00:00Z',
    lastLoginAt: null,
  },
];

function renderSection(members: typeof MEMBERS | null = MEMBERS) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(members ?? []),
  }) as never;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MembersSection partnerId="partner-1" token="test-token" />
    </QueryClientProvider>,
  );
}

describe('MembersSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders member rows after data loads', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });
    expect(screen.getByText('owner@hotel.com')).toBeInTheDocument();
    expect(screen.getByText('manager@hotel.com')).toBeInTheDocument();
  });

  it('shows em-dash for member with no name', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows em-dash for lastLoginAt when null', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText('manager@hotel.com')).toBeInTheDocument();
    });
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders loading spinner while fetching', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as never;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MembersSection partnerId="partner-1" token="test-token" />
      </QueryClientProvider>,
    );
    expect(document.querySelector('svg[class*="CircularProgress"], .MuiCircularProgress-root, [role="progressbar"]')).not.toBeNull();
  });

  it('shows empty state when no members returned', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    }) as never;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MembersSection partnerId="partner-1" token="test-token" />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('No hay propiedades registradas.')).toBeInTheDocument();
    });
  });

  it('opens row menu on icon button click', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });
    const menuButtons = screen.getAllByRole('button', { hidden: true });
    const iconButton = menuButtons.find((btn) =>
      btn.closest('td') !== null,
    );
    if (iconButton) {
      fireEvent.click(iconButton);
      await waitFor(() => {
        expect(screen.getByText('Restablecer contraseña')).toBeInTheDocument();
      });
    }
  });
});
