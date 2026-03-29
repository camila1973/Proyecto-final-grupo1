import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import type { CreateRoomDto, UpdateRoomDto } from "./rooms.types";

@Controller("rooms")
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  create(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.service.create(dto.propertyId, partnerId, dto);
  }

  @Get()
  findAll(
    @Headers("x-partner-id") partnerId: string,
    @Query("propertyId") propertyId?: string,
  ) {
    if (!propertyId) throw new BadRequestException("propertyId is required");
    return this.service.findByProperty(propertyId, partnerId);
  }

  @Get(":id")
  findOne(@Headers("x-partner-id") partnerId: string, @Param("id") id: string) {
    return this.service.findOne(id, partnerId);
  }

  @Patch(":id")
  update(
    @Headers("x-partner-id") partnerId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.update(id, partnerId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Headers("x-partner-id") partnerId: string, @Param("id") id: string) {
    return this.service.remove(id, partnerId);
  }
}
