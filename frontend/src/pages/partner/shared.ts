export const PARTNER_TAB_IDS = ['resumen', 'desembolsos', 'propiedades', 'equipo'] as const;
export type PartnerTabId = (typeof PARTNER_TAB_IDS)[number];
