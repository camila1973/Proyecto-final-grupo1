import { test, expect, setupApiMocks, CONFIRMED_RES, CHECKED_IN_RES } from '../../fixtures/base.js';
import { PropertyDashboardPage } from '../../pages/property-dashboard.page.js';

test.describe('Partner property dashboard', () => {
  let dashboard: PropertyDashboardPage;

  test.beforeEach(async ({ partnerPage }) => {
    await setupApiMocks(partnerPage);
    dashboard = new PropertyDashboardPage(partnerPage);
    await dashboard.goto();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  test('shows all reservations on initial load', async () => {
    await dashboard.expectRowCount(2);
    await expect(dashboard.rowFor(CONFIRMED_RES.guestName)).toBeVisible();
    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName)).toBeVisible();
  });

  test('shows the correct status chips for each row', async () => {
    await expect(dashboard.rowFor(CONFIRMED_RES.guestName).getByText('Confirmada')).toBeVisible();
    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName).getByText('En hotel')).toBeVisible();
  });

  // ─── Search filter ─────────────────────────────────────────────────────────

  test('filters rows by guest name', async () => {
    await dashboard.search('Ana');

    await expect(dashboard.rowFor(CONFIRMED_RES.guestName)).toBeVisible();
    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName)).toBeHidden();
  });

  test('filters rows by reservation ID', async () => {
    await dashboard.search(CONFIRMED_RES.id);

    await expect(dashboard.rowFor(CONFIRMED_RES.guestName)).toBeVisible();
    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName)).toBeHidden();
  });

  test('restores all rows when search is cleared', async () => {
    await dashboard.search('Ana');
    await dashboard.expectRowCount(1);

    await dashboard.clearSearch();
    await dashboard.expectRowCount(2);
  });

  test('shows no-results message when nothing matches search', async () => {
    await dashboard.search('zzz-no-match');

    // The component renders an empty-state row inside the table, so row count is 1.
    // Verify by the visible message instead.
    await expect(dashboard.page.getByText(/no hay reservaciones que coincidan/i)).toBeVisible();
  });

  // ─── Status filter ─────────────────────────────────────────────────────────

  test('filters rows by status dropdown', async () => {
    await dashboard.filterByStatus('Confirmada');

    await expect(dashboard.rowFor(CONFIRMED_RES.guestName)).toBeVisible();
    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName)).toBeHidden();
  });

  test('shows only checked-in rows when filtering by "En hotel"', async () => {
    await dashboard.filterByStatus('En hotel');

    await expect(dashboard.rowFor(CHECKED_IN_RES.guestName)).toBeVisible();
    await expect(dashboard.rowFor(CONFIRMED_RES.guestName)).toBeHidden();
  });

  test('restores all rows when status filter is reset to "Todos"', async () => {
    await dashboard.filterByStatus('Confirmada');
    await dashboard.expectRowCount(1);

    await dashboard.filterByStatus('Todos los estados');
    await dashboard.expectRowCount(2);
  });

  // ─── Check-in flow ─────────────────────────────────────────────────────────

  test('check-in: check-in icon is visible only for confirmed reservations', async () => {
    await expect(
      dashboard.rowFor(CONFIRMED_RES.guestName).getByRole('button', { name: /registrar check-in/i }),
    ).toBeVisible();
    await expect(
      dashboard.rowFor(CHECKED_IN_RES.guestName).getByRole('button', { name: /registrar check-in/i }),
    ).toBeHidden();
  });

  test('check-in: opens confirmation dialog', async () => {
    await dashboard.clickCheckIn(CONFIRMED_RES.guestName);
    await dashboard.expectDialogVisible();
    await expect(dashboard.dialog.getByText(/confirmar check-in/i)).toBeVisible();
  });

  test('check-in: dismissing dialog cancels the action', async () => {
    await dashboard.clickCheckIn(CONFIRMED_RES.guestName);
    await dashboard.dismissDialog();
    await dashboard.expectDialogHidden();
    await expect(dashboard.snackbar).toBeHidden();
  });

  test('check-in: confirming calls the API and shows success snackbar', async ({ partnerPage }) => {
    const checkInRequest = partnerPage.waitForRequest((req) =>
      req.url().includes(`/reservations/${CONFIRMED_RES.id}/partner-check-in`) && req.method() === 'PATCH',
    );

    await dashboard.clickCheckIn(CONFIRMED_RES.guestName);
    await dashboard.confirmDialog();

    await checkInRequest;
    await dashboard.expectSnackbar(/check-in registrado/i);
  });

  test('check-in: API error shows error snackbar', async ({ partnerPage }) => {
    await partnerPage.unroute('**/*');
    await setupApiMocks(partnerPage, { checkInFails: true });

    await dashboard.clickCheckIn(CONFIRMED_RES.guestName);
    await dashboard.confirmDialog();

    // The component surfaces err.message directly; the mock returns 'Reservation is not confirmed'.
    await dashboard.expectSnackbar(/reservation is not confirmed/i);
  });

  // ─── Check-out flow ────────────────────────────────────────────────────────

  test('check-out: check-out icon is visible only for checked-in reservations', async () => {
    await expect(
      dashboard.rowFor(CHECKED_IN_RES.guestName).getByRole('button', { name: /registrar check-out/i }),
    ).toBeVisible();
    await expect(
      dashboard.rowFor(CONFIRMED_RES.guestName).getByRole('button', { name: /registrar check-out/i }),
    ).toBeHidden();
  });

  test('check-out: opens confirmation dialog', async () => {
    await dashboard.clickCheckOut(CHECKED_IN_RES.guestName);
    await dashboard.expectDialogVisible();
    await expect(dashboard.dialog.getByText(/confirmar check-out/i)).toBeVisible();
  });

  test('check-out: confirming calls the API and shows success snackbar', async ({ partnerPage }) => {
    const checkOutRequest = partnerPage.waitForRequest((req) =>
      req.url().includes(`/reservations/${CHECKED_IN_RES.id}/check-out`) && req.method() === 'PATCH',
    );

    await dashboard.clickCheckOut(CHECKED_IN_RES.guestName);
    await dashboard.confirmDialog();

    await checkOutRequest;
    await dashboard.expectSnackbar(/check-out registrado/i);
  });

  // ─── Cancel flow ───────────────────────────────────────────────────────────

  test('cancel: context menu opens with cancel option for confirmed reservations', async () => {
    await dashboard.openRowMenu(CONFIRMED_RES.guestName);
    await expect(dashboard.page.getByRole('menuitem', { name: /cancelar reserva/i })).toBeVisible();
  });

  test('cancel: opens confirmation dialog from context menu', async () => {
    await dashboard.openRowMenu(CONFIRMED_RES.guestName);
    await dashboard.clickMenuItem('Cancelar reserva');
    await dashboard.expectDialogVisible();
    await expect(dashboard.dialog.getByText(/esta acción cancelará/i)).toBeVisible();
  });

  test('cancel: confirming calls the API and shows success snackbar', async ({ partnerPage }) => {
    const cancelRequest = partnerPage.waitForRequest((req) =>
      req.url().includes(`/reservations/${CONFIRMED_RES.id}/cancel`) && req.method() === 'PATCH',
    );

    await dashboard.openRowMenu(CONFIRMED_RES.guestName);
    await dashboard.clickMenuItem('Cancelar reserva');
    await dashboard.confirmDialog();

    await cancelRequest;
    await dashboard.expectSnackbar(/reserva cancelada/i);
  });

  test('cancel: context menu available for checked-in reservations too', async () => {
    await dashboard.openRowMenu(CHECKED_IN_RES.guestName);
    await expect(dashboard.page.getByRole('menuitem', { name: /cancelar reserva/i })).toBeVisible();
  });
});
