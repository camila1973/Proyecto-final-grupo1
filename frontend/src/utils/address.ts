export function formatAddress(
  neighborhood: string | null | undefined,
  city: string,
  countryCode: string,
): string {
  return [neighborhood, city, countryCode].filter(Boolean).join(', ');
}
