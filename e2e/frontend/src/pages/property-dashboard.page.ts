import { type Page, type Locator, expect } from '@playwright/test';
import { PROPERTY_ID } from '../fixtures/base.js';

/**
 * Page Object Model for /mi-hotel/:propertyId — partner property dashboard.
 *
 * Encapsulates all locator logic so tests stay declarative and don't break
 * when minor DOM structure changes happen.
 */
export class PropertyDashboardPage {
  readonly page: Page;

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  readonly searchInput: Locator;
  readonly statusSelect: Locator;

  // ─── Table ────────────────────────────────────────────────────────────────
  readonly table: Locator;
  readonly emptyMessage: Locator;

  // ─── Feedback ─────────────────────────────────────────────────────────────
  readonly snackbar: Locator;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchInput = page.getByPlaceholder(/buscar por/i);
    this.statusSelect = page.getByRole('combobox', { name: /estado/i });

    // The page has two tables (reservations + rooms); scope to the reservations one.
    this.table = page.getByRole('table').filter({ hasText: /# reserva/i });
    this.emptyMessage = page.getByText(/no hay reservaciones/i);

    this.snackbar = page.getByRole('alert');
    this.dialog = page.getByRole('dialog');
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async goto(propertyId = PROPERTY_ID): Promise<void> {
    await this.page.goto(`/#/mi-hotel/${propertyId}`);
    await expect(this.table).toBeVisible({ timeout: 10_000 });
  }

  // ─── Table helpers ────────────────────────────────────────────────────────

  /** All data rows (excludes the header row). */
  rows(): Locator {
    return this.table.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
  }

  /** First row that contains the given guest name. */
  rowFor(guestName: string): Locator {
    return this.table.getByRole('row').filter({ hasText: guestName });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  async filterByStatus(statusLabel: string): Promise<void> {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: statusLabel }).click();
  }

  /** Clicks the check-in icon button on the row for the given guest. */
  async clickCheckIn(guestName: string): Promise<void> {
    await this.rowFor(guestName).getByRole('button', { name: /registrar check-in/i }).click();
  }

  /** Clicks the check-out icon button on the row for the given guest. */
  async clickCheckOut(guestName: string): Promise<void> {
    await this.rowFor(guestName).getByRole('button', { name: /registrar check-out/i }).click();
  }

  /** Opens the "Más acciones" context menu on the row for the given guest. */
  async openRowMenu(guestName: string): Promise<void> {
    await this.rowFor(guestName).getByRole('button', { name: /más acciones/i }).click();
  }

  /** Clicks a menu item by its visible label text. */
  async clickMenuItem(label: string): Promise<void> {
    await this.page.getByRole('menuitem', { name: label }).click();
  }

  // ─── Dialog ───────────────────────────────────────────────────────────────

  async confirmDialog(): Promise<void> {
    // The confirm button label matches the action label (e.g. "Registrar Check-in")
    const confirmBtn = this.dialog.getByRole('button').filter({ hasNot: this.page.getByText(/regresar/i) }).last();
    await confirmBtn.click();
  }

  async dismissDialog(): Promise<void> {
    await this.dialog.getByRole('button', { name: /regresar/i }).click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async expectRowCount(n: number): Promise<void> {
    await expect(this.rows()).toHaveCount(n);
  }

  async expectSnackbar(text: string | RegExp): Promise<void> {
    // Use filter so visibility + text are checked atomically (prevents race
    // between snackbar appearing and auto-dismissing before the text check).
    await expect(this.page.getByRole('alert').filter({ hasText: text })).toBeVisible({ timeout: 8_000 });
  }

  async expectDialogVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async expectDialogHidden(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }
}
