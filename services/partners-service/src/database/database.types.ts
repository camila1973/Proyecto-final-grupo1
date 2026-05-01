import { ColumnType, Generated, Insertable, Selectable } from "kysely";

export interface PartnersTable {
  id: Generated<string>;
  name: string;
  slug: string;
  status: Generated<string>; // DEFAULT 'active'
  createdAt: Generated<Date>;
  updatedAt: ColumnType<Date, Date | undefined, Date>;
}

export interface PropertyCheckInKeysTable {
  id: Generated<string>;
  partnerId: string;
  propertyId: string;
  checkInKey: string;
  enabled: boolean;
  createdAt: Generated<Date>;
}

export interface Database {
  partners: PartnersTable;
  propertyCheckInKeys: PropertyCheckInKeysTable;
}

export type PartnerRow = Selectable<PartnersTable>;
export type NewPartner = Omit<
  Insertable<PartnersTable>,
  "id" | "createdAt" | "updatedAt"
>;
