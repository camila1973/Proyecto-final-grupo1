import { test as base, expect, type Page } from '@playwright/test';
import type { PartnerReservationRow } from './types.js';

export const PARTNER_USER = {
  id: 'user-partner-1',
  email: 'partner@travelhub.com',
  role: 'partner',
  firstName: 'Hotel',
  lastName: 'Manager',
  partnerId: 'partner-1',
} as const;

export const PROPERTY_ID = 'prop-1';

// ─── Mock data ─────────────────────────────────────────────────────────────────

export const CONFIRMED_RES: PartnerReservationRow = {
  id: 'res-001',
  status: 'confirmed',
  guestName: 'Ana García',
  guestEmail: 'ana@example.com',
  guestPhone: '+52 55 1234 5678',
  guestCount: 2,
  checkIn: '2026-05-15',
  checkOut: '2026-05-18',
  roomType: 'suite',
  grandTotalUsd: 450,
};

export const CHECKED_IN_RES: PartnerReservationRow = {
  id: 'res-002',
  status: 'checked_in',
  guestName: 'Carlos Ruiz',
  guestEmail: 'carlos@example.com',
  guestPhone: '+52 55 9876 5432',
  guestCount: 1,
  checkIn: '2026-05-10',
  checkOut: '2026-05-13',
  roomType: 'standard',
  grandTotalUsd: 300,
};

export const PROPERTY_SUMMARY = {
  propertyId: PROPERTY_ID,
  propertyName: 'Hotel Ejemplo',
  propertyCity: 'Ciudad de México',
  propertyNeighborhood: 'Polanco',
  propertyCountryCode: 'MX',
  propertyThumbnailUrl: null,
  roomCount: 5,
  reservationCount: 2,
};

export const PROPERTY_METRICS = {
  partnerId: PARTNER_USER.partnerId,
  propertyId: PROPERTY_ID,
  month: '2026-05',
  roomType: null,
  metrics: {
    confirmed: 1,
    cancelled: 0,
    revenueUsd: 450,
    lossesUsd: 0,
    netUsd: 450,
    occupancyPct: 40,
  },
  monthlySeries: [],
};

export const ROOMS_RESPONSE = {
  partnerId: PARTNER_USER.partnerId,
  propertyId: PROPERTY_ID,
  rooms: [
    { id: 'room-1', roomType: 'suite', capacity: 2, baseRateUsd: 150, status: 'active', beds: 1, available: 3 },
    { id: 'room-2', roomType: 'standard', capacity: 2, baseRateUsd: 100, status: 'active', beds: 1, available: 2 },
  ],
};

// ─── API mock helper ───────────────────────────────────────────────────────────

export interface MockApiOptions {
  reservations?: PartnerReservationRow[];
  checkInFails?: boolean;
  checkOutFails?: boolean;
  cancelFails?: boolean;
}

export async function setupApiMocks(page: Page, options: MockApiOptions = {}): Promise<void> {
  const {
    reservations = [CONFIRMED_RES, CHECKED_IN_RES],
    checkInFails = false,
    checkOutFails = false,
    cancelFails = false,
  } = options;

  await page.route('**/*', async (route) => {
    const url = route.request().url();

    // Order matters: more specific patterns first
    if (/\/api\/partners\/partners\/[^/]+\/properties\/[^/]+\/metrics/.test(url)) {
      await route.fulfill({ json: PROPERTY_METRICS });
    } else if (/\/api\/partners\/partners\/[^/]+\/properties\/[^/]+\/reservations/.test(url)) {
      await route.fulfill({
        json: {
          partnerId: PARTNER_USER.partnerId,
          propertyId: PROPERTY_ID,
          month: '2026-05',
          roomType: null,
          reservations,
        },
      });
    } else if (/\/api\/partners\/partners\/[^/]+\/properties\/[^/]+\/rooms/.test(url)) {
      await route.fulfill({ json: ROOMS_RESPONSE });
    } else if (/\/api\/partners\/partners\/[^/]+\/properties\/[^/]+$/.test(url)) {
      await route.fulfill({ json: PROPERTY_SUMMARY });
    } else if (/\/api\/booking\/reservations\/[^/]+\/partner-check-in/.test(url)) {
      if (checkInFails) {
        await route.fulfill({ status: 400, json: { message: 'Reservation is not confirmed' } });
      } else {
        await route.fulfill({ json: { id: 'res-001', status: 'checked_in' } });
      }
    } else if (/\/api\/booking\/reservations\/[^/]+\/check-out/.test(url)) {
      if (checkOutFails) {
        await route.fulfill({ status: 400, json: { message: 'Reservation is not checked in' } });
      } else {
        await route.fulfill({ json: { id: 'res-002', status: 'checked_out' } });
      }
    } else if (/\/api\/booking\/reservations\/[^/]+\/cancel/.test(url)) {
      if (cancelFails) {
        await route.fulfill({ status: 400, json: { message: 'Cannot cancel this reservation' } });
      } else {
        await route.fulfill({ json: { id: 'res-001', status: 'cancelled' } });
      }
    } else {
      await route.continue();
    }
  });
}

// ─── Extended test fixture ─────────────────────────────────────────────────────

export const test = base.extend<{ partnerPage: Page }>({
  partnerPage: async ({ page }, use) => {
    // Inject auth into localStorage before any navigation
    await page.addInitScript((user) => {
      localStorage.setItem('auth_token', 'mock-jwt-partner-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
    }, PARTNER_USER);

    await use(page);
  },
});

export { expect };
