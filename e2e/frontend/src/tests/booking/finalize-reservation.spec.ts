import { expect } from '@playwright/test';
import { test } from '../../fixtures/traveller';
import { TripsPage } from '../../pages/trips.page';
import { CheckoutPage } from '../../pages/checkout.page';
import { createHeldReservation } from '../../helpers/api';

// Scenario 5 · Finalizar reservación
test('Viajero · complete payment for a held reservation from /trips', async ({
  authenticatedPage: page,
  authToken,
  authUser,
}) => {
  // Arrange: a held reservation already exists for the logged-in user.
  // Going through the UI just to leave it in `held` is fragile (the 15-min
  // hold timer keeps ticking), so we create it via the API instead — this
  // matches what "Reservar y luego abandonar el checkout" would produce.
  const held = await createHeldReservation({ token: authToken, bookerId: authUser.id });

  const trips = new TripsPage(page);
  const checkout = new CheckoutPage(page);

  await trips.goto();
  await trips.clickCompletePayment(held.id);

  await page.waitForURL(/#\/booking\/checkout/, { timeout: 20_000 });
  await checkout.waitForReady();
  await checkout.fillGuestInfo();
  await checkout.submitWithTestCard();

  await page.waitForURL(
    new RegExp(`#/booking/confirmation\\?reservationId=${held.id}`),
    { timeout: 30_000 },
  );

  // Confirmation page must render the success state and surface the
  // reservation's short id (first 8 chars uppercased). The "timeout" title
  // is also accepted because local/CI doesn't forward Stripe webhooks.
  await expect(
    page.getByText(/Reserva exitosa|¡Pago recibido!/),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(`#${held.id.slice(0, 8).toUpperCase()}`, { exact: true }),
  ).toBeVisible();
});
