import * as React from 'react';

import { usePaymentPolling } from './usePaymentPolling';
import { API_BASE } from '@/constants/api';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));

const flushPromises = () => new Promise<void>((resolve) => process.nextTick(resolve));

describe('usePaymentPolling', () => {
  let setStatus: jest.Mock;
  let setFailureReason: jest.Mock;
  let setTimedOut: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    setStatus = jest.fn();
    setFailureReason = jest.fn();
    setTimedOut = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function mountHook(fetchMock: jest.Mock) {
    global.fetch = fetchMock;

    (React.useState as jest.Mock)
      .mockReturnValueOnce(['pending', setStatus])
      .mockReturnValueOnce([undefined, setFailureReason])
      .mockReturnValueOnce([false, setTimedOut]);

    let effectCleanup: (() => void) | undefined;
    (React.useEffect as jest.Mock).mockImplementationOnce((fn: () => () => void) => {
      effectCleanup = fn();
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePaymentPolling('res-123');
    return effectCleanup;
  }

  // ─── Initial state ──────────────────────────────────────────────────────────

  it('returns the initial pending state', () => {
    (React.useState as jest.Mock)
      .mockReturnValueOnce(['pending', setStatus])
      .mockReturnValueOnce([undefined, setFailureReason])
      .mockReturnValueOnce([false, setTimedOut]);
    (React.useEffect as jest.Mock).mockImplementationOnce(jest.fn());

    const result = usePaymentPolling('res-123');

    expect(result.status).toBe('pending');
    expect(result.failureReason).toBeUndefined();
    expect(result.timedOut).toBe(false);
  });

  // ─── API endpoint ───────────────────────────────────────────────────────────

  it('calls the correct API endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'captured' }),
    });
    mountHook(fetchMock);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/payment/payments/res-123/status`,
    );
  });

  // ─── Terminal statuses ──────────────────────────────────────────────────────

  it('sets status to captured and stops polling', async () => {
    mountHook(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'captured' }),
    }));
    await flushPromises();

    expect(setStatus).toHaveBeenCalledWith('captured');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sets status to failed and stores the failure reason', async () => {
    mountHook(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'failed', failureReason: 'Card declined' }),
    }));
    await flushPromises();

    expect(setStatus).toHaveBeenCalledWith('failed');
    expect(setFailureReason).toHaveBeenCalledWith('Card declined');
  });

  // ─── Pending → keeps polling ────────────────────────────────────────────────

  it('schedules the next poll when status is still pending', async () => {
    mountHook(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'pending' }),
    }));
    await flushPromises();

    expect(setStatus).toHaveBeenCalledWith('pending');
    expect(jest.getTimerCount()).toBe(1);
  });

  // ─── Error handling ─────────────────────────────────────────────────────────

  it('retries after a non-ok HTTP response', async () => {
    mountHook(jest.fn().mockResolvedValue({ ok: false, status: 503 }));
    await flushPromises();

    expect(setStatus).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
  });

  it('retries after a network error', async () => {
    mountHook(jest.fn().mockRejectedValue(new Error('Network failure')));
    await flushPromises();

    expect(setStatus).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
  });

  // ─── Timeout ────────────────────────────────────────────────────────────────

  it('sets timedOut when the 20-second limit is exceeded', async () => {
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(21_000);

    mountHook(jest.fn());
    await flushPromises();

    expect(setTimedOut).toHaveBeenCalledWith(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  it('cleanup cancels the pending retry timer', async () => {
    const cleanup = mountHook(jest.fn().mockResolvedValue({ ok: false }));
    await flushPromises();

    expect(jest.getTimerCount()).toBe(1);
    cleanup?.();
    expect(jest.getTimerCount()).toBe(0);
  });
});
