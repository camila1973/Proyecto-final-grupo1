/**
 * Tests for stripe-wrapper module
 * Validates conditional Stripe loading for web and native platforms
 */

// Mock Platform before any imports
const mockPlatform = { OS: 'ios' };
jest.mock('react-native', () => ({
  Platform: mockPlatform,
}));

describe('stripe-wrapper', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('on native platforms', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('should export useStripe hook from native module', () => {
      // Mock the native Stripe module
      jest.mock('@stripe/stripe-react-native', () => ({
        useStripe: jest.fn(() => ({
          initPaymentSheet: jest.fn(),
          presentPaymentSheet: jest.fn(),
        })),
        StripeProvider: jest.fn(({ children }) => children),
      }));

      const { useStripe, StripeProvider } = require('./stripe-wrapper');

      expect(useStripe).toBeDefined();
      expect(StripeProvider).toBeDefined();
      expect(typeof useStripe).toBe('function');
    });
  });

  describe('on web platform', () => {
    beforeEach(() => {
      mockPlatform.OS = 'web';
    });

    it('should export mock useStripe for web', () => {
      jest.resetModules();
      const { useStripe } = require('./stripe-wrapper');

      expect(useStripe).toBeDefined();
      
      const hook = useStripe();
      expect(hook.initPaymentSheet).toBeDefined();
      expect(hook.presentPaymentSheet).toBeDefined();
    });

    it('should return errors from mock Stripe methods', async () => {
      jest.resetModules();
      const { useStripe } = require('./stripe-wrapper');

      const hook = useStripe();
      
      const initResult = await hook.initPaymentSheet();
      expect(initResult.error).toBeDefined();
      expect(initResult.error.message).toContain('Stripe not supported on web');

      const presentResult = await hook.presentPaymentSheet();
      expect(presentResult.error).toBeDefined();
      expect(presentResult.error.message).toContain('Stripe not supported on web');
    });

    it('should export mock StripeProvider for web', () => {
      jest.resetModules();
      const { StripeProvider } = require('./stripe-wrapper');

      expect(StripeProvider).toBeDefined();
      
      // Mock provider should just return children
      const children = 'test-children';
      const result = StripeProvider({ children, publishableKey: 'pk_test_123' });
      expect(result).toBe(children);
    });
  });

  describe('module loading', () => {
    it('should not crash when @stripe/stripe-react-native is not available on web', () => {
      mockPlatform.OS = 'web';
      jest.resetModules();
      
      // Should not throw when loading the module
      expect(() => {
        require('./stripe-wrapper');
      }).not.toThrow();
    });
  });
});
