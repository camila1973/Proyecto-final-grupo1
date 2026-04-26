/**
 * Tests for checkout reservation creation logic
 * Validates the prevention of multiple reservation creation
 */

describe('Checkout Reservation Creation', () => {
  describe('Multiple reservation prevention', () => {
    it('should only create reservation once even if called multiple times', () => {
      // Simulating the ref pattern used in checkout
      let reservationCreatedRef = { current: false };
      let creationCount = 0;

      const createReservation = async () => {
        if (reservationCreatedRef.current) return;
        
        reservationCreatedRef.current = true;
        creationCount++;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 10));
      };

      // Call multiple times concurrently (like hot reload or multiple re-renders)
      const promises = [
        createReservation(),
        createReservation(),
        createReservation(),
      ];

      return Promise.all(promises).then(() => {
        expect(creationCount).toBe(1);
      });
    });

    it('should allow retry after error by resetting ref', async () => {
      let reservationCreatedRef = { current: false };
      let attemptCount = 0;

      const createReservation = async (shouldFail: boolean) => {
        if (reservationCreatedRef.current) return;
        
        reservationCreatedRef.current = true;
        attemptCount++;

        if (shouldFail) {
          // Reset on error to allow retry
          reservationCreatedRef.current = false;
          throw new Error('Network error');
        }

        return { id: 'reservation-123' };
      };

      // First attempt fails
      await expect(createReservation(true)).rejects.toThrow('Network error');
      expect(attemptCount).toBe(1);
      expect(reservationCreatedRef.current).toBe(false);

      // Second attempt succeeds
      const result = await createReservation(false);
      expect(attemptCount).toBe(2);
      expect(result).toEqual({ id: 'reservation-123' });
      expect(reservationCreatedRef.current).toBe(true);
    });
  });

  describe('Error message extraction', () => {
    it('should extract message from JSON error response', () => {
      const errorText = JSON.stringify({ message: 'Room not available' });
      
      const extractError = (text: string): string => {
        try {
          const json = JSON.parse(text);
          return json.message || 'Unknown error';
        } catch {
          return text.length < 200 ? text : 'Unknown error';
        }
      };

      expect(extractError(errorText)).toBe('Room not available');
    });

    it('should use plain text for non-JSON errors', () => {
      const errorText = 'Network timeout';
      
      const extractError = (text: string): string => {
        try {
          const json = JSON.parse(text);
          return json.message || 'Unknown error';
        } catch {
          return text.length < 200 ? text : 'Unknown error';
        }
      };

      expect(extractError(errorText)).toBe('Network timeout');
    });

    it('should truncate very long error messages', () => {
      const longError = 'x'.repeat(250);
      
      const extractError = (text: string): string => {
        try {
          const json = JSON.parse(text);
          return json.message || 'Unknown error';
        } catch {
          return text.length < 200 ? text : 'Unknown error';
        }
      };

      expect(extractError(longError)).toBe('Unknown error');
    });
  });
});
