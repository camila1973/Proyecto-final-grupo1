import * as React from 'react';
import { usePendingReservation } from './usePendingReservation';
import {
  getPendingReservation,
  subscribePendingReservation,
} from '@/services/pending-reservations-store';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: jest.fn(),
}));

describe('usePendingReservation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the value provided by useSyncExternalStore', () => {
    (React.useSyncExternalStore as jest.Mock).mockReturnValue(true);

     
    expect(usePendingReservation()).toBe(true);
  });

  it('wires the store subscribe + getSnapshot through', () => {
    (React.useSyncExternalStore as jest.Mock).mockReturnValue(false);

     
    usePendingReservation();

    expect(React.useSyncExternalStore).toHaveBeenCalledWith(
      subscribePendingReservation,
      getPendingReservation,
    );
  });
});
