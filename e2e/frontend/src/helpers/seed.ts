// Constants pinned to the seed data in
//   services/auth-service/scripts/seed.ts
//   services/inventory-service/scripts/seed.ts
// If any of those scripts change, mirror the change here.

export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
export const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? 'http://localhost:4200';

// Pre-seeded user with mfa_required = false (lets us log in without solving an OTP).
export const E2E_USER = {
  id: 'e1000000-0000-0000-0000-000000000099',
  email: 'e2e@travelhub.com',
  password: 'E2eTest1234!',
};

// Gran Caribe Resort & Spa (Cancún), deluxe king ocean room.
export const SEEDED_PROPERTY = {
  id: 'b1000000-0000-0000-0000-000000000001',
  partnerId: 'a1000000-0000-0000-0000-000000000001',
  roomId: 'c1000000-0000-0000-0000-000000000001',
  city: 'Cancún',
  name: 'Gran Caribe Resort & Spa',
};

// Booked ranges in the seed only touch March/April 2027. Pick a clear window.
export const BOOKING_WINDOW = {
  checkIn: '2027-06-15',
  checkOut: '2027-06-17',
  guests: 2,
};
