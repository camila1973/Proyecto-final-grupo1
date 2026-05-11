import type { Generated, Selectable, Insertable } from "kysely";

export interface DeviceTokenTable {
  id: Generated<string>;
  user_id: string;
  token: string;
  platform: "ios" | "android";
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  device_tokens: DeviceTokenTable;
}

export type DeviceTokenRow = Selectable<DeviceTokenTable>;
export type NewDeviceToken = Insertable<DeviceTokenTable>;
