import React from 'react';

export const useStripe = () => ({
  initPaymentSheet: async () => ({ error: new Error('Stripe not supported on web') }),
  presentPaymentSheet: async () => ({ error: new Error('Stripe not supported on web') }),
});

export const StripeProvider = ({
  children,
}: {
  children: React.ReactNode;
  publishableKey?: string;
  merchantIdentifier?: string;
}) => children as React.ReactElement;
