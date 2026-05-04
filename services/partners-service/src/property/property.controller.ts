import { Controller, Get, Param, Query } from "@nestjs/common";
import { PropertyService } from "./property.service.js";

@Controller("partners")
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get(":partnerId/properties")
  properties(@Param("partnerId") partnerId: string) {
    return this.propertyService.getProperties(partnerId);
  }

  @Get(":partnerId/properties/:propertyId")
  property(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.propertyService.getPropertySummary(partnerId, propertyId);
  }

  @Get(":partnerId/properties/:propertyId/metrics")
  propertyMetrics(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
    @Query("month") month?: string,
    @Query("roomType") roomType?: string,
  ) {
    const safeMonth = isMonth(month) ? month! : currentMonth();
    const safeRoomType = roomType?.trim() ? roomType.trim() : null;
    return this.propertyService.getPropertyMetrics(
      partnerId,
      propertyId,
      safeMonth,
      safeRoomType,
    );
  }

  @Get(":partnerId/properties/:propertyId/reservations")
  propertyReservations(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
    @Query("month") month?: string,
    @Query("roomType") roomType?: string,
    @Query("status") status?: string,
    @Query("reservationId") reservationId?: string,
    @Query("guestName") guestName?: string,
  ) {
    const safeMonth = isMonth(month) ? month! : currentMonth();
    const safeRoomType = roomType?.trim() ? roomType.trim() : null;
    const safeStatus = status?.trim() ? status.trim() : null;
    const safeReservationId = reservationId?.trim()
      ? reservationId.trim()
      : null;
    const safeGuestName = guestName?.trim() ? guestName.trim() : null;
    return this.propertyService.getPropertyReservations(
      partnerId,
      propertyId,
      safeMonth,
      safeRoomType,
      safeStatus,
      safeReservationId,
      safeGuestName,
    );
  }
}

function isMonth(s: string | undefined): boolean {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
