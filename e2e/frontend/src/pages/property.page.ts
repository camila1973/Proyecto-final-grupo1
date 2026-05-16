import { type Page, expect } from '@playwright/test';

export class PropertyPage {
  constructor(private readonly page: Page) {}

  // The page header has a "Reservar" button too; we want the per-room button
  // because that's the one wired to the booking flow. The per-room button has
  // a Bookmark icon and lives inside the room list, so we look up the first
  // matching button after the "Habitaciones disponibles" heading.
  async bookFirstRoom(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Habitaciones disponibles' })).toBeVisible({
      timeout: 15_000,
    });
    const roomsSection = this.page.locator('section').filter({
      has: this.page.getByRole('heading', { name: 'Habitaciones disponibles' }),
    });
    await roomsSection.getByRole('button', { name: 'Reservar' }).first().click();
  }
}
