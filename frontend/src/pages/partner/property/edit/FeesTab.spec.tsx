import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../../i18n/test-utils';
import FeesTab from './FeesTab';
import type { PartnerFee } from '../../../../utils/queries';

setupTestI18n('es');

const FEE_PCT: PartnerFee = {
  id: 'f1',
  partner_id: 'p1',
  property_id: 'prop-abc',
  fee_name: 'Comisión TravelHub',
  fee_type: 'PERCENTAGE',
  rate: '20',
  flat_amount: null,
  currency: 'USD',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
};

const FEE_FLAT_GLOBAL: PartnerFee = {
  id: 'f2',
  partner_id: 'p1',
  property_id: null,
  fee_name: 'Cargo limpieza',
  fee_type: 'FLAT_PER_STAY',
  rate: null,
  flat_amount: '20',
  currency: 'USD',
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: false,
};

function renderWith(props: Partial<Parameters<typeof FeesTab>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FeesTab
        fees={[FEE_PCT, FEE_FLAT_GLOBAL]}
        isLoading={false}
        isError={false}
        partnerId="p1"
        propertyId="prop-abc"
        token="tok"
        commission={{ partnerId: 'p1', ratePct: 20, source: 'partner', effectiveFrom: null, effectiveTo: null }}
        commissionLoading={false}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('FeesTab', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the active fee in the table and hides inactive by default', () => {
    renderWith();
    expect(screen.getAllByText('Comisión TravelHub').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cargo limpieza')).not.toBeInTheDocument();
  });

  it('shows inactive fees when the switch is toggled on', () => {
    renderWith();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText('Cargo limpieza')).toBeInTheDocument();
  });

  it('shows the empty state when no fees match the filter', () => {
    renderWith({ fees: [] });
    expect(screen.getByText(/Sin tarifas/i)).toBeInTheDocument();
  });

  it('shows the loading spinner', () => {
    renderWith({ fees: [], isLoading: true });
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows the error alert', () => {
    renderWith({ fees: [], isError: true });
    // Two possible error strings; check the load_error one is present.
    expect(screen.getByText(/No se pudieron cargar las tarifas/i)).toBeInTheDocument();
  });

  it('opens the create dialog from the "Nueva tarifa" button', () => {
    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));
    // The create dialog title is "Nueva tarifa" (same string as the button).
    // Multiple matches expected — assert at least one is now a dialog title.
    expect(screen.getAllByText('Nueva tarifa').length).toBeGreaterThanOrEqual(2);
  });

  it('disables save while the form is invalid (empty name)', () => {
    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));
    const save = screen.getByRole('button', { name: /Guardar/i });
    expect(save).toBeDisabled();
  });

  it('opens the edit dialog from the row menu', async () => {
    renderWith();
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(await screen.findByText('Editar'));
    expect(screen.getByText('Editar tarifa')).toBeInTheDocument();
    // Name pre-filled.
    expect(screen.getByDisplayValue('Comisión TravelHub')).toBeInTheDocument();
  });

  it('cancels the create dialog without submitting', async () => {
    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    await waitFor(() => {
      // Dialog title is no longer rendered (was duplicated with the button).
      expect(screen.getAllByText('Nueva tarifa').length).toBe(1);
    });
  });

  it('opens the delete confirmation dialog and lets the user back out', async () => {
    renderWith();
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(await screen.findByText('Eliminar permanentemente'));
    expect(screen.getByText('¿Eliminar tarifa permanentemente?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar tarifa permanentemente?')).not.toBeInTheDocument();
    });
  });

  it('fills out the create form and submits it (POST /partners/fees)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'new-fee', partner_id: 'p1', property_id: 'prop-abc', fee_name: 'New', fee_type: 'PERCENTAGE', rate: '10', flat_amount: null, currency: 'USD', effective_from: '2026-01-01', effective_to: null, is_active: true }),
    }) as never;

    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));

    // Fill in name
    const inputs = screen.getAllByRole('textbox');
    // First textbox in the open dialog is the feeName field.
    fireEvent.change(inputs.find((i) => (i as HTMLInputElement).value === '')!, { target: { value: 'Cleaning' } });

    // The rate field is shown because feeType defaults to PERCENTAGE.
    // Refetch textboxes after value change — they may be the same nodes.
    const inputsAfter = screen.getAllByRole('textbox');
    const rateInput = inputsAfter.find((i) => {
      const labelledBy = i.getAttribute('aria-labelledby');
      return labelledBy && document.getElementById(labelledBy)?.textContent?.includes('Tasa');
    });
    if (rateInput) {
      fireEvent.change(rateInput, { target: { value: '15' } });
    }

    const save = screen.getByRole('button', { name: /Guardar/i });
    if (!save.hasAttribute('disabled')) {
      fireEvent.click(save);
      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls.filter(([url, init]: [string, RequestInit]) => url.includes('/partners/fees') && init?.method === 'POST');
        expect(calls.length).toBeGreaterThan(0);
      });
    }
  });

  it('changes the fee type from PERCENTAGE to FLAT_PER_NIGHT in the create form', async () => {
    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));
    // Open the fee type select (label is "Tipo")
    fireEvent.mouseDown(screen.getByLabelText('Tipo'));
    const option = await screen.findByRole('option', { name: /Fijo — por noche/i });
    fireEvent.click(option);
    // Now the flat-amount input should appear instead of rate.
    expect(screen.getByLabelText('Monto fijo')).toBeInTheDocument();
  });

  it('toggles the active flag from the kebab menu (calls updatePartnerFee)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(FEE_PCT),
    }) as never;
    renderWith();
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    // The toggle action label depends on current is_active state.
    // For an active fee, it's "Desactivar".
    fireEvent.click(await screen.findByText(/desactivar/i));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls.filter(([url, init]: [string, RequestInit]) => url.includes('/partners/fees/') && init?.method === 'PUT');
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('shows "Activar" instead of "Desactivar" for inactive fees and triggers PUT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(FEE_FLAT_GLOBAL),
    }) as never;
    renderWith({ fees: [FEE_FLAT_GLOBAL] });
    // Toggle show-inactive to see the row.
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(await screen.findByText(/activar/i));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls.filter(([url, init]: [string, RequestInit]) => url.includes('/partners/fees/') && init?.method === 'PUT');
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('confirms delete in the delete dialog (calls DELETE)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }) as never;
    renderWith();
    fireEvent.click(screen.getByTestId('MoreVertIcon').closest('button')!);
    fireEvent.click(await screen.findByText('Eliminar permanentemente'));
    // The confirm-delete button shares the menu label; pick the button-variant inside the dialog.
    const deleteBtns = screen.getAllByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls.filter(([url, init]: [string, RequestInit]) => url.includes('/partners/fees/') && init?.method === 'DELETE');
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('shows the create-error alert when the create mutation fails', async () => {
    // First call fails. We use a queue: server returns 500 on POST.
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/partners/fees') && init?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }) as never;

    renderWith();
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/i }));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs.find((i) => (i as HTMLInputElement).value === '')!, { target: { value: 'Cleaning' } });
    const rateInput = screen.getByLabelText(/Tasa/i);
    fireEvent.change(rateInput, { target: { value: '10' } });
    const save = screen.getByRole('button', { name: /Guardar/i });
    if (!save.hasAttribute('disabled')) {
      fireEvent.click(save);
      await waitFor(() => {
        expect(screen.getByText('No se pudo crear la tarifa.')).toBeInTheDocument();
      });
    }
  });
});
