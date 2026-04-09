import {
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

@Controller("availability")
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  getAvailability(
    @Query("roomId") roomId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const ids = roomId.split(",").map((id) => id.trim());
    return this.service.bulkCheck(ids, fromDate!, toDate!);
  }

  @Post("reduce")
  @HttpCode(204)
  reduceCapacity(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: ReduceCapacityDto,
  ) {
    return this.service.reduceCapacity(partnerId, dto);
  }

  @Post("block")
  @HttpCode(204)
  blockDates(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: BlockDatesDto,
  ) {
    return this.service.blockDates(dto.roomId, partnerId, dto);
  }

  @Post("unblock")
  @HttpCode(204)
  unblockDates(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: BlockDatesDto,
  ) {
    return this.service.unblockDates(dto.roomId, partnerId, dto);
  }

  @Post("hold")
  @HttpCode(204)
  hold(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.hold(body.roomId, body.fromDate, body.toDate);
  }

  @Post("unhold")
  @HttpCode(204)
  unhold(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.unhold(body.roomId, body.fromDate, body.toDate);
  }

  @Post("confirm")
  @HttpCode(204)
  confirm(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.confirm(body.roomId, body.fromDate, body.toDate);
  }

  @Post("release")
  @HttpCode(204)
  release(@Body() body: { roomId: string; fromDate: string; toDate: string }) {
    return this.service.release(body.roomId, body.fromDate, body.toDate);
  }
}
