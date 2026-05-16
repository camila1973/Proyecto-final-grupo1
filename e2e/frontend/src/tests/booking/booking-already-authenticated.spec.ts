import { expect } from '@playwright/test';
import { test } from '../../fixtures/traveller';
import { SearchPage } from '../../pages/search.page';
import { PropertyPage } from '../../pages/property.page';
import { CheckoutPage } from '../../pages/checkout.page';

// Scenario 4 · Reservar sesión ya iniciada
test('Viajero · search → checkout without auth detour', async ({ authenticatedPage: page }) => {
  const search = new SearchPage(page);
  const property = new PropertyPage(page);
  const checkout = new CheckoutPage(page);

  await search.searchSeededProperty();
  await search.openFirstResult();
  await property.bookFirstRoom();

  // Already authenticated, so the booking flow goes straight to checkout.
  await page.waitForURL(/#\/booking\/checkout/, { timeout: 20_000 });
  await checkout.waitForReady();
  await checkout.fillGuestInfo();
  await checkout.submitWithTestCard();

  await page.waitForURL(/#\/booking\/confirmation\?reservationId=/, { timeout: 30_000 });

  // Confirmation page must render the success state (either the success
  // title once Stripe's webhook lands, or the timeout twin when the webhook
  // hasn't been forwarded in local/CI).
  await expect(
    page.getByText(/Reserva exitosa|¡Pago recibido!/),
  ).toBeVisible({ timeout: 30_000 });
});
