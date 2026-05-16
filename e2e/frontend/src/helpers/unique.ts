import { randomBytes } from 'crypto';

export function uniqueEmail(prefix = 'traveller'): string {
  const tag = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  return `${prefix}+${tag}@e2e.test`;
}
