import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropertyReviewsSection from './PropertyReviewsSection';
import { setupTestI18n } from '../../i18n/test-utils';
import es from '../../i18n/locales/es.json';

setupTestI18n('es');

function makeResponse(page: number, total: number) {
  const totalPages = Math.ceil(total / 5);
  const pageSize = 5;
  const remaining = total - (page - 1) * pageSize;
  const count = Math.max(0, Math.min(pageSize, remaining));
  const reviews = Array.from({ length: count }, (_, i) => ({
    id: `rv-${page}-${i}`,
    reviewerName: `Reviewer ${page}-${i}`,
    reviewerCountry: 'US',
    rating: 5,
    language: 'es',
    title: `Title ${page}-${i}`,
    comment: `Comment ${page}-${i}`,
    createdAt: '2026-03-01T00:00:00.000Z',
  }));
  return {
    meta: { page, pageSize, total, totalPages, averageRating: 4.6 },
    reviews,
  };
}

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PropertyReviewsSection propertyId="p1" />
    </QueryClientProvider>,
  );
}

describe('PropertyReviewsSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows loading text while the first page is fetching', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient();
    expect(await screen.findByText(es.property_detail.reviews_loading)).toBeInTheDocument();
  });

  it('renders fetched reviews with average rating', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse(1, 5)),
    });
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('Reviewer 1-0')).toBeInTheDocument();
    });
    expect(screen.getByText(/4\.6/)).toBeInTheDocument();
  });

  it('shows "Load more" when there are more pages', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse(1, 12)),
    });
    renderWithClient();
    expect(
      await screen.findByText(es.property_detail.reviews_load_more),
    ).toBeInTheDocument();
  });

  it('does not show "Load more" on the last page', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse(1, 3)),
    });
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('Reviewer 1-0')).toBeInTheDocument();
    });
    expect(
      screen.queryByText(es.property_detail.reviews_load_more),
    ).not.toBeInTheDocument();
  });

  it('loads the next page when "Load more" is clicked', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const match = /page=(\d+)/.exec(url);
      const page = match ? parseInt(match[1], 10) : 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(makeResponse(page, 10)),
      });
    });
    renderWithClient();
    const btn = await screen.findByText(es.property_detail.reviews_load_more);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Reviewer 2-0')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reviews', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse(1, 0)),
    });
    renderWithClient();
    expect(
      await screen.findByText(es.property_detail.reviews_empty),
    ).toBeInTheDocument();
  });

  it('shows error state when fetch rejects', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    renderWithClient();
    expect(
      await screen.findByText(es.property_detail.reviews_error),
    ).toBeInTheDocument();
  });

  it('sends the current language as the lang query parameter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse(1, 3)),
    });
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('Reviewer 1-0')).toBeInTheDocument();
    });
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toContain('lang=es');
  });
});