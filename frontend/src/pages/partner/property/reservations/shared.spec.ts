import {
  diffPayload,
  emptyForm,
  fromReservation,
  nightsBetween,
  validateForm,
  type ReservationEditForm,
  type ReservationSeed,
} from './shared';

const t = (key: string) => key;

const SEED: ReservationSeed = {
  guestInfo: {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    phone: '+1234',
  },
  checkIn: '2026-05-01',
  checkOut: '2026-05-04',
};

describe('reservation edit / shared', () => {
  describe('emptyForm', () => {
    it('returns blank fields', () => {
      expect(emptyForm()).toEqual({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        checkIn: '',
        checkOut: '',
      });
    });
  });

  describe('fromReservation', () => {
    it('maps guest info and trims dates to YYYY-MM-DD', () => {
      expect(
        fromReservation({
          guestInfo: SEED.guestInfo,
          checkIn: '2026-05-01T00:00:00.000Z',
          checkOut: '2026-05-04T12:00:00.000Z',
        }),
      ).toEqual({
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        phone: '+1234',
        checkIn: '2026-05-01',
        checkOut: '2026-05-04',
      });
    });

    it('handles missing guest info fields gracefully', () => {
      expect(
        fromReservation({
          guestInfo: { firstName: 'A', lastName: 'B', email: 'a@b.c' } as never,
          checkIn: '2026-05-01',
          checkOut: '2026-05-04',
        }).phone,
      ).toBe('');
    });
  });

  describe('validateForm', () => {
    const validForm: ReservationEditForm = {
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
      phone: '+1',
      checkIn: '2026-05-10',
      checkOut: '2026-05-14',
    };

    it('returns no errors for a valid form', () => {
      expect(validateForm(validForm, '2026-05-01', t)).toEqual({});
    });

    it('flags missing first name', () => {
      const errs = validateForm({ ...validForm, firstName: '   ' }, '2026-05-01', t);
      expect(errs.firstName).toBeDefined();
    });

    it('flags missing last name', () => {
      const errs = validateForm({ ...validForm, lastName: '' }, '2026-05-01', t);
      expect(errs.lastName).toBeDefined();
    });

    it('flags an invalid email', () => {
      const errs = validateForm({ ...validForm, email: 'not-an-email' }, '2026-05-01', t);
      expect(errs.email).toBe('partner.reservation_edit.errors.email_invalid');
    });

    it('flags an empty email', () => {
      const errs = validateForm({ ...validForm, email: '' }, '2026-05-01', t);
      expect(errs.email).toBe('partner.reservation_edit.errors.email_required');
    });

    it('flags equal check-in and check-out', () => {
      const errs = validateForm(
        { ...validForm, checkIn: '2026-05-10', checkOut: '2026-05-10' },
        '2026-05-01',
        t,
      );
      expect(errs.dates).toBe('partner.reservation_edit.errors.dates_invalid');
    });

    it('flags a past check-in', () => {
      const errs = validateForm(
        { ...validForm, checkIn: '2026-04-01', checkOut: '2026-04-05' },
        '2026-05-01',
        t,
      );
      expect(errs.dates).toBe('partner.reservation_edit.errors.checkin_past');
    });
  });

  describe('diffPayload', () => {
    const baseForm = fromReservation(SEED);

    it('returns an empty payload when nothing changed', () => {
      expect(diffPayload(baseForm, SEED)).toEqual({});
    });

    it('includes only the dates that changed', () => {
      const payload = diffPayload({ ...baseForm, checkIn: '2026-05-10' }, SEED);
      expect(payload).toEqual({ checkIn: '2026-05-10' });
    });

    it('sends a guestInfo block when any guest field changes, trimming whitespace', () => {
      const payload = diffPayload({ ...baseForm, firstName: ' Bea ' }, SEED);
      expect(payload.guestInfo).toEqual({
        firstName: 'Bea',
        lastName: 'García',
        email: 'ana@example.com',
        phone: '+1234',
      });
    });

    it('combines date and guest info changes', () => {
      const payload = diffPayload(
        { ...baseForm, checkOut: '2026-05-06', email: 'new@x.com' },
        SEED,
      );
      expect(payload.checkOut).toBe('2026-05-06');
      expect(payload.guestInfo?.email).toBe('new@x.com');
    });
  });

  describe('nightsBetween', () => {
    it('returns the day count between two dates', () => {
      expect(nightsBetween('2026-05-01', '2026-05-04')).toBe(3);
    });

    it('returns 0 for invalid (reversed) ranges instead of negatives', () => {
      expect(nightsBetween('2026-05-04', '2026-05-01')).toBe(0);
    });
  });
});
