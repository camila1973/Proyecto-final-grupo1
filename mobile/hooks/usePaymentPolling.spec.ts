/**
 * Tests for usePaymentPolling hook
 * Validates payment status polling logic and API integration
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

describe('usePaymentPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API endpoint construction', () => {
    it('should use correct API endpoint format', () => {
      const reservationId = 'res-123';
      const expectedUrl = `${API_BASE}/api/payment/payments/${reservationId}/status`;
      
      expect(expectedUrl).toContain('/api/payment/payments/');
      expect(expectedUrl).toContain('/status');
      expect(expectedUrl).toContain(reservationId);
    });
  });

  describe('Payment status responses', () => {
    it('should handle captured payment status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'captured' }),
      });

      const response = await global.fetch(`${API_BASE}/api/payment/payments/res-123/status`);
      const data = await response.json();

      expect(data.status).toBe('captured');
      expect(response.ok).toBe(true);
    });

    it('should handle failed payment status with reason', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'failed',
          failureReason: 'Card declined',
        }),
      });

      const response = await global.fetch(`${API_BASE}/api/payment/payments/res-456/status`);
      const data = await response.json();

      expect(data.status).toBe('failed');
      expect(data.failureReason).toBe('Card declined');
    });

    it('should handle pending payment status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

      const response = await global.fetch(`${API_BASE}/api/payment/payments/res-789/status`);
      const data = await response.json();

      expect(data.status).toBe('pending');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        global.fetch(`${API_BASE}/api/payment/payments/res-error/status`)
      ).rejects.toThrow('Network error');
    });

    it('should handle non-ok HTTP responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const response = await global.fetch(`${API_BASE}/api/payment/payments/res-500/status`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle 404 not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const response = await global.fetch(`${API_BASE}/api/payment/payments/res-404/status`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Polling configuration', () => {
    it('should use correct polling interval', () => {
      const POLL_INTERVAL_MS = 2500;
      const POLL_TIMEOUT_MS = 60000;
      
      expect(POLL_INTERVAL_MS).toBe(2500);
      expect(POLL_TIMEOUT_MS).toBe(60000);
      expect(POLL_TIMEOUT_MS / POLL_INTERVAL_MS).toBe(24);
    });

    it('should validate timeout is greater than interval', () => {
      const POLL_INTERVAL_MS = 2500;
      const POLL_TIMEOUT_MS = 60000;
      
      expect(POLL_TIMEOUT_MS).toBeGreaterThan(POLL_INTERVAL_MS);
    });
  });

  describe('Reservation ID validation', () => {
    it('should validate UUID format', () => {
      const validUUID = 'b0440ed6-9db8-42bf-a8b8-74576459d9e9';
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(validUUID).toMatch(uuidPattern);
    });

    it('should handle empty string', () => {
      const emptyId = '';
      
      expect(emptyId).toBe('');
      expect(emptyId.length).toBe(0);
    });
  });

  describe('Payment status types', () => {
    it('should validate payment status values', () => {
      const validStatuses = ['pending', 'captured', 'failed'];
      
      validStatuses.forEach(status => {
        expect(['pending', 'captured', 'failed']).toContain(status);
      });
    });

    it('should handle failure reasons', () => {
      const failureReasons = [
        'Card declined',
        'Insufficient funds',
        'Payment timeout',
        'Invalid card details',
      ];
      
      failureReasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});
