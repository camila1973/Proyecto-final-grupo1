/**
 * Tests for stripe-wrapper.web module
 * Validates web-specific Stripe mock implementation
 */

import React from 'react';

describe('stripe-wrapper.web', () => {
  let useStripe: any;
  let StripeProvider: any;

  beforeEach(() => {
    jest.resetModules();
    const module = require('./stripe-wrapper.web');
    useStripe = module.useStripe;
    StripeProvider = module.StripeProvider;
  });

  describe('useStripe', () => {
    it('should return mock functions', () => {
      const stripe = useStripe();

      expect(stripe).toBeDefined();
      expect(typeof stripe.initPaymentSheet).toBe('function');
      expect(typeof stripe.presentPaymentSheet).toBe('function');
    });

    it('should return error from initPaymentSheet', async () => {
      const stripe = useStripe();
      const result = await stripe.initPaymentSheet();

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Stripe not supported on web');
    });

    it('should return error from presentPaymentSheet', async () => {
      const stripe = useStripe();
      const result = await stripe.presentPaymentSheet();

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Stripe not supported on web');
    });
  });

  describe('StripeProvider', () => {
    it('should render children without wrapper', () => {
      const children = React.createElement('div', null, 'Test Child');
      const result = StripeProvider({ children });

      expect(result).toBe(children);
    });

    it('should accept publishableKey prop', () => {
      const children = React.createElement('div', null, 'Test');
      const result = StripeProvider({ 
        children, 
        publishableKey: 'pk_test_123' 
      });

      expect(result).toBe(children);
    });

    it('should accept merchantIdentifier prop', () => {
      const children = React.createElement('div', null, 'Test');
      const result = StripeProvider({ 
        children, 
        merchantIdentifier: 'merchant.com.example' 
      });

      expect(result).toBe(children);
    });
  });
});
