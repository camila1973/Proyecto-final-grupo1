import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
  create(@Body() dto: CreateRoomRateDto) {
    return this.service.create(dto.roomId, dto.partnerId!, dto);
  }

  @Get()
  findAll(
    @Query("partnerId") partnerId: string,
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
  replace(@Param("id") id: string, @Body() dto: CreateRoomRateDto) {
    return this.service.replace(id, dto.partnerId!, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string, @Query("partnerId") partnerId: string) {
    return this.service.remove(id, partnerId);
  }
}
