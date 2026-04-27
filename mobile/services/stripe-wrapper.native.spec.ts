/**
 * Tests for stripe-wrapper.native module
 * Validates native Stripe re-export
 */

describe('stripe-wrapper.native', () => {
  it('should re-export useStripe from native module', () => {
    // Mock the native module
    jest.mock('@stripe/stripe-react-native', () => ({
      useStripe: jest.fn(() => ({
        initPaymentSheet: jest.fn(),
        presentPaymentSheet: jest.fn(),
      })),
      StripeProvider: jest.fn(({ children }) => children),
    }));

    const { useStripe } = require('./stripe-wrapper.native');

    expect(useStripe).toBeDefined();
    expect(typeof useStripe).toBe('function');
  });

  it('should re-export StripeProvider from native module', () => {
    jest.mock('@stripe/stripe-react-native', () => ({
      useStripe: jest.fn(),
      StripeProvider: jest.fn(({ children }) => children),
    }));

    const { StripeProvider } = require('./stripe-wrapper.native');

    expect(StripeProvider).toBeDefined();
    expect(typeof StripeProvider).toBe('function');
  });
});
