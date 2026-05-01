import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { PartnersService } from "./partners.service.js";
import {
  CreatePartnerDto,
  RegisterPartnerDto,
  UpdatePartnerDto,
} from "./dto/partner.dto.js";

@Controller("partners")
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  findAll() {
    return this.partnersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterPartnerDto) {
    return this.partnersService.register(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }
}
