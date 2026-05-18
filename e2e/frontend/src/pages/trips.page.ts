import { type Page, type Locator, expect } from '@playwright/test';

export class TripsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('#/trips');
    // The trips heading is a styled <p>, not an actual heading element. Wait
    // on the URL and the "Mis reservaciones" text anywhere on the page (the
    // navbar entry doesn't count — it's a button — but the page title does).
    await this.page.waitForURL(/#\/trips/, { timeout: 15_000 });
    await expect(this.page.getByText('Mis reservaciones', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  // A reservation's row is rendered by HorizontalCard → MUI `Card`, so its
  // root element is `.MuiCard-root`. We pick the card containing the short id
  // (first 6 chars of the UUID, uppercased) rendered as "#XXXXXX".
  row(reservationId: string): Locator {
    const shortId = `#${reservationId.slice(0, 6).toUpperCase()}`;
    return this.page.locator('.MuiCard-root').filter({ hasText: shortId });
  }

  async clickCompletePayment(reservationId: string): Promise<void> {
    await this.row(reservationId).getByRole('button', { name: 'Completar pago' }).click();
  }

  async cancel(reservationId: string): Promise<void> {
    await this.row(reservationId).getByRole('button', { name: 'Cancelar' }).click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Sí, cancelar' }).click();
  }
}
