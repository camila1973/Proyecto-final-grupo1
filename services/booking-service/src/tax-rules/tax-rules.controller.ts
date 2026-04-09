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
import { TaxRulesService } from "./tax-rules.service.js";
import { CreateTaxRuleDto } from "./dto/create-tax-rule.dto.js";
import { UpdateTaxRuleDto } from "./dto/update-tax-rule.dto.js";

@Controller("tax-rules")
export class TaxRulesController {
  constructor(private readonly service: TaxRulesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaxRuleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query("country") country?: string) {
    return this.service.findAll(country);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTaxRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
