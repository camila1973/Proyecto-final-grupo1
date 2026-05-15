import type { GuestInfo, ModifyReservationInput } from '../../../../utils/queries';

export interface ReservationEditForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
}

export interface ReservationSeed {
  guestInfo: GuestInfo;
  checkIn: string;
  checkOut: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyForm(): ReservationEditForm {
  return { firstName: '', lastName: '', email: '', phone: '', checkIn: '', checkOut: '' };
}

export function fromReservation(seed: ReservationSeed): ReservationEditForm {
  return {
    firstName: seed.guestInfo.firstName ?? '',
    lastName: seed.guestInfo.lastName ?? '',
    email: seed.guestInfo.email ?? '',
    phone: seed.guestInfo.phone ?? '',
    checkIn: seed.checkIn.slice(0, 10),
    checkOut: seed.checkOut.slice(0, 10),
  };
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  dates?: string;
}

export function validateForm(
  form: ReservationEditForm,
  todayIso: string,
  t: (key: string) => string,
): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = t('partner.reservation_edit.errors.first_name_required');
  if (!form.lastName.trim()) errors.lastName = t('partner.reservation_edit.errors.last_name_required');
  if (!form.email.trim()) errors.email = t('partner.reservation_edit.errors.email_required');
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = t('partner.reservation_edit.errors.email_invalid');
  if (form.checkIn >= form.checkOut) errors.dates = t('partner.reservation_edit.errors.dates_invalid');
  else if (form.checkIn < todayIso) errors.dates = t('partner.reservation_edit.errors.checkin_past');
  return errors;
}

export function diffPayload(
  form: ReservationEditForm,
  seed: ReservationSeed,
): ModifyReservationInput {
  const payload: ModifyReservationInput = {};
  const seedForm = fromReservation(seed);
  if (form.checkIn !== seedForm.checkIn) payload.checkIn = form.checkIn;
  if (form.checkOut !== seedForm.checkOut) payload.checkOut = form.checkOut;
  if (
    form.firstName !== seedForm.firstName ||
    form.lastName !== seedForm.lastName ||
    form.email !== seedForm.email ||
    form.phone !== seedForm.phone
  ) {
    payload.guestInfo = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
  }
  return payload;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const ms = co.getTime() - ci.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
