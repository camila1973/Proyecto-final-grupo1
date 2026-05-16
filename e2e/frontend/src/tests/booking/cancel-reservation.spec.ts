import { expect } from '@playwright/test';
import { test } from '../../fixtures/traveller';
import { TripsPage } from '../../pages/trips.page';
import { createConfirmedReservation } from '../../helpers/api';

// Scenario 6 · Cancelar reservación
test('Viajero · cancel a confirmed reservation from /trips', async ({
  authenticatedPage: page,
  authToken,
  authUser,
}) => {
  // Arrange: walk a fresh reservation through held → submitted → confirmed
  // via API so the cancel test starts from the right state without going
  // through Stripe.
  const confirmed = await createConfirmedReservation({
    token: authToken,
    bookerId: authUser.id,
  });

  const trips = new TripsPage(page);
  await trips.goto();

  const row = trips.row(confirmed.id);
  await expect(row.getByText('Confirmada', { exact: true })).toBeVisible({ timeout: 15_000 });

  await trips.cancel(confirmed.id);

  // After cancel the row's status pill flips to "Cancelada".
  await expect(row.getByText('Cancelada', { exact: true })).toBeVisible({ timeout: 15_000 });
});
