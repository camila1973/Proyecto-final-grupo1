import { type Page } from '@playwright/test';

// Adapted from https://github.com/microsoft/playwright/issues/6148#issuecomment-1930748934
// (mcbridemarci · 2024-02-06 · CC BY-SA 4.0)
//
// Stripe's PaymentElement renders the entire payment UI inside the iframe
// wrapped by `div.__PrivateStripeElement`. Inside that iframe the method
// picker (Card / Cash App Pay / Amazon Pay …) is plain divs; the secured
// inputs have ids `#payment-numberInput`, `#payment-expiryInput`,
// `#payment-cvcInput` (the SO comment's `#Field-*Input` ids are for the
// older standalone CardElement). With multiple methods enabled the Card
// panel is collapsed by default, so click "Card" once to open it.
//
// Card 4242 4242 4242 4242 is the canonical Stripe test card; in test mode it
// completes inline without a 3DS challenge.
export async function fillStripeCard(
  page: Page,
  options: { cardNumber?: string; expiry?: string; cvc?: string; postal?: string } = {},
): Promise<void> {
  const cardNumber = options.cardNumber ?? '4242424242424242';
  const expiry = options.expiry ?? '12/34';
  const cvc = options.cvc ?? '567';
  const postal = options.postal ?? '12345';

  const iframeLocator = page.frameLocator('div.__PrivateStripeElement iframe');

  const cardEntry = iframeLocator.getByText('Card', { exact: true }).first();
  await cardEntry.waitFor({ state: 'visible', timeout: 10_000 });
  await cardEntry.click();

  const cardField = iframeLocator.locator('#payment-numberInput');
  await cardField.waitFor({ state: 'visible', timeout: 20_000 });
  await cardField.click();
  await cardField.fill(cardNumber);

  const expField = iframeLocator.locator('#payment-expiryInput');
  await expField.click();
  await expField.fill(expiry);

  const cvcField = iframeLocator.locator('#payment-cvcInput');
  await cvcField.click();
  await cvcField.fill(cvc);

  const country = iframeLocator.locator('#payment-countryInput');
  if (await country.count()) {
    await country.selectOption('US').catch(() => undefined);
  }
  const postalField = iframeLocator.locator('#payment-postalCodeInput');
  if (await postalField.count()) {
    await postalField.click();
    await postalField.fill(postal);
  }
}
