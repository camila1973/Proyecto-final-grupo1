import { expect } from '@playwright/test';
import { test } from '../../fixtures/traveller';
import { SearchPage } from '../../pages/search.page';
import { PropertyPage } from '../../pages/property.page';
import { LoginPage } from '../../pages/login.page';
import { CheckoutPage } from '../../pages/checkout.page';
import { E2E_USER } from '../../helpers/seed';

// Scenario 3b · Reservar con cuenta
// (Scenario 3a — register from the booking gate — is intentionally not covered:
// a fresh registration auto-logs the user in and lands on /login/mfa, which the
// test can't solve deterministically without an MFA bypass for new users.)
test('Viajero · login from booking gate, then checkout', async ({ page }) => {
  const search = new SearchPage(page);
  const property = new PropertyPage(page);
  const login = new LoginPage(page);
  const checkout = new CheckoutPage(page);

  await search.searchSeededProperty();
  await search.openFirstResult();
  await property.bookFirstRoom();

  await page.waitForURL(/#\/login(\?|$)/);
  await login.fillAndSubmit(E2E_USER.email, E2E_USER.password);

  await page.waitForURL(/#\/booking\/checkout/, { timeout: 20_000 });
  await checkout.waitForReady();
  await checkout.fillGuestInfo();
  await checkout.submitWithTestCard();

  await page.waitForURL(/#\/booking\/confirmation\?reservationId=/, { timeout: 30_000 });

  // Confirmation page must render the success state. With no Stripe webhook
  // forwarding in local/CI, the reservation stays `submitted` and the page
  // shows the "timeout" twin ("¡Pago recibido!"); when the webhook does
  // arrive it flips to "Reserva exitosa". Either proves the happy path.
  await expect(
    page.getByText(/Reserva exitosa|¡Pago recibido!/),
  ).toBeVisible({ timeout: 30_000 });
});
