export const PROPERTY_TAB_IDS = ['resumen', 'pagos', 'reservas', 'habitaciones'] as const;
export type PropertyTabId = (typeof PROPERTY_TAB_IDS)[number];
