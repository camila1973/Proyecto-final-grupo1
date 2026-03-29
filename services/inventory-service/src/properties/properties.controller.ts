import {
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
import { PropertiesService } from "./properties.service";
import type { CreatePropertyDto, UpdatePropertyDto } from "./properties.types";

@Controller("properties")
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Post()
  create(
    @Headers("x-partner-id") partnerId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.service.create(partnerId, dto);
  }

  @Get()
  findAll(
    @Headers("x-partner-id") partnerId: string,
    @Query("city") city?: string,
    @Query("status") status?: string,
  ) {
    return this.service.findAll(partnerId, city, status);
  }

  @Get(":id")
  findOne(@Headers("x-partner-id") partnerId: string, @Param("id") id: string) {
    return this.service.findOne(id, partnerId);
  }

  @Patch(":id")
  update(
    @Headers("x-partner-id") partnerId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.service.update(id, partnerId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Headers("x-partner-id") partnerId: string, @Param("id") id: string) {
    return this.service.remove(id, partnerId);
  }
}
