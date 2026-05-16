import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import ReportExportToolbar from './ReportExportToolbar';

setupTestI18n('es');

const BASE = {
  partnerId: 'partner-1',
  propertyId: null,
  token: 'tok',
  language: 'es' as const,
  mode: 'month' as const,
  month: '2026-05',
  year: 2026,
  onModeChange: jest.fn(),
  onMonthChange: jest.fn(),
  onYearChange: jest.fn(),
};

function mockDownload() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: jest.fn().mockResolvedValue(new Blob(['x'])),
    headers: { get: () => null },
  }) as never;
  global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
  global.URL.revokeObjectURL = jest.fn();
  const realCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      return { href: '', download: '', click: jest.fn() } as unknown as HTMLAnchorElement;
    }
    return realCreate(tag);
  });
}

describe('ReportExportToolbar', () => {
  beforeEach(() => {
    BASE.onModeChange = jest.fn();
    BASE.onMonthChange = jest.fn();
    BASE.onYearChange = jest.fn();
  });

  afterEach(() => {
    (document.createElement as unknown as jest.SpyInstance).mockRestore?.();
    jest.resetAllMocks();
  });

  it('renders month and year toggles', () => {
    render(<ReportExportToolbar {...BASE} />);
    expect(screen.getByRole('button', { name: /mes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /año/i })).toBeInTheDocument();
  });

  it('fires onMonthChange when the prev-month arrow is clicked', () => {
    render(<ReportExportToolbar {...BASE} />);
    fireEvent.click(screen.getByLabelText('prev-month'));
    expect(BASE.onMonthChange).toHaveBeenCalled();
  });

  it('fires onMonthChange when the next-month arrow is clicked', () => {
    render(<ReportExportToolbar {...BASE} />);
    fireEvent.click(screen.getByLabelText('next-month'));
    expect(BASE.onMonthChange).toHaveBeenCalled();
  });

  it('switches into year mode and exposes year arrows', () => {
    render(<ReportExportToolbar {...BASE} mode="year" />);
    fireEvent.click(screen.getByLabelText('prev-year'));
    expect(BASE.onYearChange).toHaveBeenCalledWith(2025);
    fireEvent.click(screen.getByLabelText('next-year'));
    expect(BASE.onYearChange).toHaveBeenCalledWith(2027);
  });

  it('calls onModeChange when toggling from month to year', () => {
    render(<ReportExportToolbar {...BASE} />);
    fireEvent.click(screen.getByRole('button', { name: /año/i }));
    expect(BASE.onModeChange).toHaveBeenCalledWith('year');
  });

  it('downloads partner-level payments when propertyId is null', async () => {
    render(<ReportExportToolbar {...BASE} />);
    mockDownload();
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toContain('/partners/partner-1/payments');
    });
  });

  it('downloads property-scoped payments when propertyId is set', async () => {
    render(<ReportExportToolbar {...BASE} propertyId="prop-abc" />);
    mockDownload();
    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('/partners/partner-1/properties/prop-abc/payments');
    });
  });
});
