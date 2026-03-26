import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// TanStack Router uses the Web Streams API internally; jsdom doesn't provide these globals.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// jsdom doesn't implement window.scrollTo; suppress the not-implemented error.
window.scrollTo = jest.fn();
