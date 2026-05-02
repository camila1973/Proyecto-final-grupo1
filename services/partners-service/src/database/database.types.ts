import { ColumnType, Generated, Insertable, Selectable } from "kysely";

export interface PartnersTable {
  id: Generated<string>;
  name: string;
  slug: string;
  identifier: Generated<string>;
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

export interface PartnerMembersTable {
  id: Generated<string>;
  partnerId: string;
  userId: string;
  role: Generated<string>; // DEFAULT 'manager' — 'owner' | 'manager'
  propertyId: string | null;
  status: Generated<string>; // DEFAULT 'active'
  createdAt: Generated<Date>;
}

export interface Database {
  partners: PartnersTable;
  propertyCheckInKeys: PropertyCheckInKeysTable;
  partnerMembers: PartnerMembersTable;
}

export type PartnerMemberRow = Selectable<PartnerMembersTable>;
export type NewPartnerMember = Omit<
  Insertable<PartnerMembersTable>,
  "id" | "createdAt"
>;

export type PartnerRow = Selectable<PartnersTable>;
export type NewPartner = Omit<
  Insertable<PartnersTable>,
  "id" | "createdAt" | "updatedAt"
>;
