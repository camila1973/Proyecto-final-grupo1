import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
} from "@nestjs/common";
import { AvailabilityService } from "./availability.service";
import type { BlockDatesDto, ReduceCapacityDto } from "./availability.types";
import { RoomsService } from "../rooms/rooms.service";

@Controller()
export class AvailabilityController {
  constructor(
    private readonly service: AvailabilityService,
    private readonly roomsService: RoomsService,
  ) {}

  // ── Partner routes ────────────────────────────────────────────────

  @Get("availability")
  async getAvailability(
    @Headers("x-partner-id") partnerId: string,
    @Query("propertyId") propertyId?: string,
    @Query("roomId") roomId?: string,
    @Query("roomIds") roomIds?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    if (roomIds) {
      const ids = roomIds.split(",").map((id) => id.trim());
      return this.service.bulkCheck(ids, fromDate!, toDate!);
    }
    if (!propertyId) {
      throw new BadRequestException("propertyId is required");
    }
    const rooms = await this.roomsService.findByProperty(propertyId, partnerId);
    const ids = roomId ? [roomId] : rooms.map((r) => r.id);
    return this.service.bulkCheck(ids, fromDate!, toDate!);
  }

  @Post("availability/reduce")
  @HttpCode(204)
  reduceCapacity(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: ReduceCapacityDto,
  ) {
    return this.service.reduceCapacity(partnerId, dto);
  }

  @Post("availability/block")
  @HttpCode(204)
  blockDates(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: BlockDatesDto,
  ) {
    return this.service.blockDates(dto.roomId, partnerId, dto);
  }

  @Post("availability/unblock")
  @HttpCode(204)
  unblockDates(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: BlockDatesDto,
  ) {
    return this.service.unblockDates(dto.roomId, partnerId, dto);
  }

  @Post("availability/hold")
  @HttpCode(204)
  hold(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.hold(body.roomId, body.fromDate, body.toDate);
  }

  @Post("availability/unhold")
  @HttpCode(204)
  unhold(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.unhold(body.roomId, body.fromDate, body.toDate);
  }

  @Post("availability/confirm")
  @HttpCode(204)
  confirm(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.confirm(body.roomId, body.fromDate, body.toDate);
  }

  @Post("availability/release")
  @HttpCode(204)
  release(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.release(body.roomId, body.fromDate, body.toDate);
  }
}
