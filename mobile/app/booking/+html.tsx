/**
 * This file disables static/server rendering for booking routes on web.
 * The booking flow uses @stripe/stripe-react-native which is native-only.
 */

export { unstable_NoSSR as default } from 'expo-router';
