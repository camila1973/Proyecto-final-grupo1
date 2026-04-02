import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
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
  create(@Body() dto: CreatePropertyDto) {
    return this.service.create(dto.partnerId, dto);
  }

  @Get()
  findAll(
    @Query("partnerId") partnerId: string | undefined,
    @Query("city") city?: string,
    @Query("status") status?: string,
  ) {
    if (!partnerId)
      throw new BadRequestException("partnerId query param is required");
    return this.service.findAll(partnerId, city, status);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const detail = await this.service.findDetail(id);
    if (!detail) throw new NotFoundException(`Property ${id} not found`);
    return detail;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePropertyDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
