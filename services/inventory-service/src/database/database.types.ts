import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

// DATE columns: pg returns 'YYYY-MM-DD' strings; accept Date or string on insert/update
type DateColumn = ColumnType<string, Date | string, Date | string>;

export interface InvPropertiesTable {
  id: Generated<string>;
  name: string;
  type: string;
  city: string;
  stars: ColumnType<
    number | null,
    number | null | undefined,
    number | null | undefined
  >;
  status: Generated<string>; // DEFAULT 'active'
  country_code: string;
  partner_id: string;
  neighborhood: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  lat: ColumnType<
    number | null,
    number | null | undefined,
    number | null | undefined
  >;
  lon: ColumnType<
    number | null,
    number | null | undefined,
    number | null | undefined
  >;
  rating: Generated<string>; // NUMERIC returned as string, DEFAULT 0
  review_count: Generated<number>; // DEFAULT 0
  thumbnail_url: Generated<string>; // DEFAULT ''
  amenities: Generated<string[]>; // DEFAULT '{}'
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface InvRoomsTable {
  id: Generated<string>;
  property_id: string;
  room_type: string;
  bed_type: Generated<string>; // DEFAULT ''
  view_type: Generated<string>; // DEFAULT ''
  capacity: number;
  total_rooms: number;
  base_price_usd: string; // NUMERIC returned as string by pg
  status: Generated<string>; // DEFAULT 'active'
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface InvRoomRatesTable {
  id: Generated<string>;
  room_id: string;
  from_date: DateColumn;
  to_date: DateColumn;
  price_usd: string; // NUMERIC returned as string by pg
  currency: Generated<string>; // DEFAULT 'USD'
  created_at: Generated<Date>;
}

export interface InvAvailabilityTable {
  room_id: string;
  date: DateColumn;
  total_rooms: ColumnType<
    number | null,
    number | null | undefined,
    number | null | undefined
  >;
  reserved_rooms: Generated<number>;
  held_rooms: Generated<number>;
  blocked: Generated<boolean>;
}

export interface Database {
  inv_properties: InvPropertiesTable;
  inv_rooms: InvRoomsTable;
  inv_room_rates: InvRoomRatesTable;
  inv_availability: InvAvailabilityTable;
}

export type PropertyRow = Selectable<InvPropertiesTable>;
export type NewProperty = Omit<
  Insertable<InvPropertiesTable>,
  "id" | "created_at" | "updated_at"
>;
export type PropertyUpdate = Omit<
  Updateable<InvPropertiesTable>,
  "id" | "created_at" | "partner_id"
>;

export type RoomRow = Selectable<InvRoomsTable>;
export type NewRoom = Omit<
  Insertable<InvRoomsTable>,
  "id" | "created_at" | "updated_at"
>;
export type RoomUpdate = Omit<
  Updateable<InvRoomsTable>,
  "id" | "created_at" | "property_id"
>;

export type RoomRateRow = Selectable<InvRoomRatesTable>;
export type NewRoomRate = Omit<
  Insertable<InvRoomRatesTable>,
  "id" | "created_at"
>;

export type AvailabilityRow = Selectable<InvAvailabilityTable>;
