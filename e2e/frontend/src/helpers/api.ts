import { request, type APIRequestContext } from '@playwright/test';
import { API_BASE_URL, BOOKING_WINDOW, E2E_USER, SEEDED_PROPERTY } from './seed';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  partnerId?: string;
  propertyId?: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

async function api(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_BASE_URL });
}

export async function registerUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const ctx = await api();
  try {
    const res = await ctx.post('/api/auth/register', { data: params });
    if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const ctx = await api();
  try {
    const res = await ctx.post('/api/auth/login', { data: { email, password } });
    if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    const body = (await res.json()) as
      | { mfaRequired: true }
      | { mfaRequired: false; accessToken: string; user: AuthUser };
    if (body.mfaRequired) {
      throw new Error(`login requires MFA for ${email} — seed should set mfa_required=false`);
    }
    return { accessToken: body.accessToken, user: body.user };
  } finally {
    await ctx.dispose();
  }
}

export async function loginE2EUser(): Promise<LoginResult> {
  return loginUser(E2E_USER.email, E2E_USER.password);
}

export interface CreatedReservation {
  id: string;
  status: string;
  propertyId: string;
  roomId: string;
  partnerId: string;
  checkIn: string;
  checkOut: string;
  grandTotalUsd: number;
}

export async function createHeldReservation(params: {
  token: string;
  bookerId: string;
  propertyId?: string;
  roomId?: string;
  partnerId?: string;
  checkIn?: string;
  checkOut?: string;
}): Promise<CreatedReservation> {
  const ctx = await api();
  try {
    const res = await ctx.post('/api/booking/reservations', {
      headers: { Authorization: `Bearer ${params.token}` },
      data: {
        propertyId: params.propertyId ?? SEEDED_PROPERTY.id,
        roomId: params.roomId ?? SEEDED_PROPERTY.roomId,
        partnerId: params.partnerId ?? SEEDED_PROPERTY.partnerId,
        bookerId: params.bookerId,
        checkIn: params.checkIn ?? BOOKING_WINDOW.checkIn,
        checkOut: params.checkOut ?? BOOKING_WINDOW.checkOut,
      },
    });
    if (!res.ok()) throw new Error(`create reservation failed: ${res.status()} ${await res.text()}`);
    return (await res.json()) as CreatedReservation;
  } finally {
    await ctx.dispose();
  }
}

async function patch(token: string, path: string, body: unknown = {}): Promise<unknown> {
  const ctx = await api();
  try {
    const res = await ctx.patch(path, {
      headers: { Authorization: `Bearer ${token}` },
      data: body,
    });
    if (!res.ok()) throw new Error(`${path} failed: ${res.status()} ${await res.text()}`);
    return res.json();
  } finally {
    await ctx.dispose();
  }
}

export async function submitReservation(token: string, id: string): Promise<void> {
  await patch(token, `/api/booking/reservations/${id}/submit`);
}

export async function confirmReservation(token: string, id: string): Promise<void> {
  await patch(token, `/api/booking/reservations/${id}/confirm`);
}

// Walks a fresh reservation through held → submitted → confirmed. Used to
// arrange scenario 6 without going through Stripe.
export async function createConfirmedReservation(params: {
  token: string;
  bookerId: string;
}): Promise<CreatedReservation> {
  const r = await createHeldReservation(params);
  await submitReservation(params.token, r.id);
  await confirmReservation(params.token, r.id);
  return r;
}

export async function getReservation(token: string, id: string): Promise<CreatedReservation & { status: string }> {
  const ctx = await api();
  try {
    const res = await ctx.get(`/api/booking/reservations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) throw new Error(`get reservation failed: ${res.status()}`);
    return (await res.json()) as CreatedReservation & { status: string };
  } finally {
    await ctx.dispose();
  }
}
