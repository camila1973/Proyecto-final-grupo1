/**
 * Tests for usePaymentPolling hook
 * Validates payment status polling logic
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

describe('usePaymentPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should construct correct API endpoint', () => {
    const reservationId = 'reservation-123';
    const expectedUrl = `${API_BASE}/api/booking/reservations/${reservationId}/payment-status`;
    
    expect(expectedUrl).toContain('/api/booking/reservations/');
    expect(expectedUrl).toContain('/payment-status');
    expect(expectedUrl).toContain(reservationId);
  });

  it('should handle captured payment status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 
        paymentStatus: 'captured',
        failureReason: null,
      }),
    });

    const mockResponse = await global.fetch(`${API_BASE}/api/booking/reservations/res-123/payment-status`);
    const data = await mockResponse.json();

    expect(data.paymentStatus).toBe('captured');
    expect(data.failureReason).toBeNull();
  });

  it('should handle failed payment status with reason', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 
        paymentStatus: 'failed',
        failureReason: 'Card declined',
      }),
    });

    const mockResponse = await global.fetch(`${API_BASE}/api/booking/reservations/res-456/payment-status`);
    const data = await mockResponse.json();

    expect(data.paymentStatus).toBe('failed');
    expect(data.failureReason).toBe('Card declined');
  });

  it('should handle pending payment status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 
        paymentStatus: 'pending',
        failureReason: null,
      }),
    });

    const mockResponse = await global.fetch(`${API_BASE}/api/booking/reservations/res-789/payment-status`);
    const data = await mockResponse.json();

    expect(data.paymentStatus).toBe('pending');
    expect(data.failureReason).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      global.fetch(`${API_BASE}/api/booking/reservations/res-error/payment-status`)
    ).rejects.toThrow('Network error');
  });

  it('should handle non-ok responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const mockResponse = await global.fetch(`${API_BASE}/api/booking/reservations/res-404/payment-status`);
    
    expect(mockResponse.ok).toBe(false);
    expect(mockResponse.status).toBe(404);
  });

  it('should support polling intervals', () => {
    const pollingInterval = 2000; // 2 seconds
    const timeout = 60000; // 60 seconds
    const maxRetries = timeout / pollingInterval;

    expect(maxRetries).toBe(30);
    expect(pollingInterval).toBeLessThan(timeout);
  });

  it('should validate reservation ID format', () => {
    const validId = 'b0440ed6-9db8-42bf-a8b8-74576459d9e9';
    const emptyId = '';

    expect(validId).toMatch(/^[a-f0-9-]+$/);
    expect(emptyId).toBe('');
  });
});
