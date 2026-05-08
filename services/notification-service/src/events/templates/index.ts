import type { BookingRoutingKey, Renderer } from "../types.js";
import { render as cancelled } from "./booking-cancelled.js";
import { render as confirmed } from "./booking-confirmed.js";
import { render as checkedIn } from "./booking-checked-in.js";
import { render as checkedOut } from "./booking-checked-out.js";
import { render as failed } from "./booking-failed.js";
import { render as expired } from "./booking-expired.js";

export const templates: Record<BookingRoutingKey, Renderer> = {
  "booking.cancelled": cancelled,
  "booking.confirmed": confirmed,
  "booking.checked_in": checkedIn,
  "booking.checked_out": checkedOut,
  "booking.failed": failed,
  "booking.expired": expired,
};
