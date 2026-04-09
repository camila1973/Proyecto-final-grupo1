import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FeesService } from "./fees.service.js";
import { CreateFeeDto } from "./dto/create-fee.dto.js";
import { UpdateFeeDto } from "./dto/update-fee.dto.js";

@Controller("fees")
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFeeDto) {
    return this.feesService.create(dto);
  }

  @Get()
  findAll(@Query("partnerId") partnerId: string) {
    return this.feesService.findAll(partnerId);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFeeDto & { partnerId: string },
  ) {
    return this.feesService.update(id, dto.partnerId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.feesService.remove(id);
  }
}
