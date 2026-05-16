import { type Page, expect } from '@playwright/test';
import { fillStripeCard } from '../helpers/stripe';

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async waitForReady(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Finalizar reserva' })).toBeVisible({
      timeout: 20_000,
    });
    // The form only mounts once the reservation POST resolves — wait until at
    // least the "Nombre" field is rendered.
    await expect(this.page.getByLabel('Nombre', { exact: true })).toBeVisible({ timeout: 20_000 });
  }

  async fillGuestInfo(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } = {}): Promise<void> {
    // Most of these come pre-filled from the auth user, but we always overwrite
    // them so the test is independent of auth context state.
    const firstName = params.firstName ?? 'E2E';
    const lastName = params.lastName ?? 'Test';
    const email = params.email ?? 'guest@e2e.test';
    const phone = params.phone ?? '+5491100000000';

    const fn = this.page.getByLabel('Nombre', { exact: true });
    await fn.fill('');
    await fn.fill(firstName);

    const ln = this.page.getByLabel('Apellido', { exact: true });
    await ln.fill('');
    await ln.fill(lastName);

    const em = this.page.getByLabel('Correo electrónico', { exact: true });
    await em.fill('');
    await em.fill(email);

    const ph = this.page.getByLabel('Teléfono', { exact: true });
    await ph.fill('');
    await ph.fill(phone);
  }

  async submitWithTestCard(): Promise<void> {
    await fillStripeCard(this.page);
    await this.page.getByRole('button', { name: 'Reservar ahora' }).click();
  }
}
