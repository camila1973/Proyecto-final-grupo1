import { type Page, expect } from '@playwright/test';
import { BOOKING_WINDOW, SEEDED_PROPERTY } from '../helpers/seed';

export class SearchPage {
  constructor(private readonly page: Page) {}

  // The home page hero search form posts to /search; we go straight there with
  // the URL params filled in to avoid the city autocomplete + MUI date pickers.
  async searchSeededProperty(): Promise<void> {
    const search = new URLSearchParams({
      city: SEEDED_PROPERTY.city,
      countryCode: 'MX',
      checkIn: BOOKING_WINDOW.checkIn,
      checkOut: BOOKING_WINDOW.checkOut,
      guests: String(BOOKING_WINDOW.guests),
    });
    await this.page.goto(`/#/search?${search.toString()}`);
  }

  // Each result card exposes a "Reservar" button. The seed has 3 Cancún
  // properties and all have availability in our date window, so the first
  // result is always bookable.
  async openFirstResult(): Promise<void> {
    const firstBook = this.page.getByRole('button', { name: 'Reservar' }).first();
    await expect(firstBook).toBeVisible({ timeout: 15_000 });
    await firstBook.click();
  }
}
