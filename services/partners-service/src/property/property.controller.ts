import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
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

  @Get(":partnerId/properties/:propertyId/rooms")
  propertyRooms(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.propertyService.getPropertyRooms(
      partnerId,
      propertyId,
      currentMonth(),
    );
  }

  @Get(":partnerId/properties/:propertyId/rooms/:roomId")
  async roomDetail(@Param("roomId") roomId: string) {
    const room = await this.propertyService.getRoomDetail(roomId);
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    return room;
  }

  @Get(":partnerId/properties/:propertyId/rooms/:roomId/availability")
  roomAvailability(
    @Param("roomId") roomId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const { from, to } = safeDateRange(fromDate, toDate);
    return this.propertyService.getRoomAvailability(roomId, from, to);
  }

  @Get(":partnerId/properties/:propertyId/rooms/:roomId/rates")
  roomRates(
    @Param("propertyId") propertyId: string,
    @Param("roomId") roomId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const { from, to } = safeDateRange(fromDate, toDate);
    return this.propertyService.getRoomRates(roomId, propertyId, from, to);
  }

  @Post(":partnerId/properties/:propertyId/rooms/:roomId/block")
  blockRoom(
    @Param("roomId") roomId: string,
    @Body() body: { fromDate: string; toDate: string },
  ) {
    return this.propertyService.blockRoomDates(
      roomId,
      body.fromDate,
      body.toDate,
    );
  }

  @Post(":partnerId/properties/:propertyId/rooms/:roomId/unblock")
  unblockRoom(
    @Param("roomId") roomId: string,
    @Body() body: { fromDate: string; toDate: string },
  ) {
    return this.propertyService.unblockRoomDates(
      roomId,
      body.fromDate,
      body.toDate,
    );
  }

  @Post(":partnerId/properties/:propertyId/rooms/:roomId/rates")
  createRate(
    @Param("roomId") roomId: string,
    @Body() body: { fromDate: string; toDate: string; priceUsd: number },
  ) {
    return this.propertyService.createRoomRate(
      roomId,
      body.fromDate,
      body.toDate,
      body.priceUsd,
    );
  }

  @Delete(":partnerId/properties/:propertyId/rooms/:roomId/rates/:rateId")
  @HttpCode(204)
  deleteRate(@Param("rateId") rateId: string): Promise<void> {
    return this.propertyService.deleteRoomRate(rateId);
  }

  @Put(":partnerId/properties/:propertyId/rooms/:roomId/rates/:rateId")
  updateRate(
    @Param("rateId") rateId: string,
    @Body() body: { fromDate: string; toDate: string; priceUsd: number },
  ): Promise<void> {
    return this.propertyService.updateRoomRate(
      rateId,
      body.fromDate,
      body.toDate,
      body.priceUsd,
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

function safeDateRange(
  fromDate: string | undefined,
  toDate: string | undefined,
): { from: string; to: string } {
  const isDate = (s: string | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const month = currentMonth();
  const [y, m] = month.split("-").map(Number);
  const defaultFrom = `${month}-01`;
  const next = new Date(Date.UTC(y, m, 1));
  const defaultTo = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return {
    from: isDate(fromDate) ? fromDate : defaultFrom,
    to: isDate(toDate) ? toDate : defaultTo,
  };
}
