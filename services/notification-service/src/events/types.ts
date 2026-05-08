// Kept in sync with services/booking-service/src/events/events.types.ts.

export type BookingRoutingKey =
  | "booking.cancelled"
  | "booking.confirmed"
  | "booking.checked_in"
  | "booking.checked_out"
  | "booking.failed"
  | "booking.expired";

export type BookingActor = "guest" | "partner" | "system";

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

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

export interface RenderedMessage {
  channel: "email" | "push";
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export type Renderer = (event: BookingEvent) => RenderedMessage | null;
