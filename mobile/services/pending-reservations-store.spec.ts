import {
  getPendingReservation,
  setPendingReservation,
  subscribePendingReservation,
} from './pending-reservations-store';

describe('pending-reservations-store', () => {
  afterEach(() => {
    setPendingReservation(false);
  });

  it('starts as false', () => {
    expect(getPendingReservation()).toBe(false);
  });

  it('reflects the most recent value', () => {
    setPendingReservation(true);
    expect(getPendingReservation()).toBe(true);
    setPendingReservation(false);
    expect(getPendingReservation()).toBe(false);
  });

  it('notifies subscribers on change', () => {
    const listener = jest.fn();
    subscribePendingReservation(listener);

    setPendingReservation(true);
    setPendingReservation(false);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify if the value is unchanged', () => {
    setPendingReservation(true);
    const listener = jest.fn();
    subscribePendingReservation(listener);

    setPendingReservation(true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribePendingReservation(listener);

    setPendingReservation(true);
    unsubscribe();
    setPendingReservation(false);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
