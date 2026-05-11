import type { GuestInfo } from "../database/database.types.js";

export type BookingRoutingKey =
  | "booking.cancelled"
  | "booking.confirmed"
  | "booking.checked_in"
  | "booking.checked_out"
  | "booking.failed"
  | "booking.expired"
  | "booking.no_show";

export type BookingActor = "guest" | "partner" | "system";

export interface BookingEvent {
  routingKey: BookingRoutingKey;
  reservationId: string;
  partnerId: string;
  propertyId: string;
  roomId: string;
  bookerId: string;
  guestInfo: GuestInfo | null;
  checkIn: string;
  checkOut: string;
  actor: BookingActor;
  reason?: string;
  timestamp: string;
}
