// Vite replaces import.meta.env at build time.
// In Jest (CommonJS) this file is replaced by __mocks__/env.ts via moduleNameMapper.
export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
