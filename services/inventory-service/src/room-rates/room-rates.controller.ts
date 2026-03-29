import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { RoomRatesService } from "./room-rates.service";
import type { CreateRoomRateDto } from "./room-rates.types";

@Controller("rates")
export class RoomRatesController {
  constructor(private readonly service: RoomRatesService) {}

  @Post()
  create(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: CreateRoomRateDto,
  ) {
    return this.service.create(dto.roomId, partnerId, dto);
  }

  @Get()
  findAll(
    @Headers("x-partner-id") partnerId: string,
    @Query("roomId") roomId?: string,
    @Query("propertyId") propertyId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    if (!propertyId) {
      throw new BadRequestException("propertyId is required");
    }
    if (roomId)
      return this.service.findByRoom(roomId, partnerId, fromDate, toDate);
    return this.service.findByProperty(propertyId, partnerId, fromDate, toDate);
  }

  @Put(":id")
  replace(
    @Headers("x-partner-id") partnerId: string,
    @Param("id") id: string,
    @Body() dto: CreateRoomRateDto,
  ) {
    return this.service.replace(id, partnerId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Headers("x-partner-id") partnerId: string, @Param("id") id: string) {
    return this.service.remove(id, partnerId);
  }
}
