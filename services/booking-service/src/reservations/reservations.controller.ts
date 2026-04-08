import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ReservationsService } from "./reservations.service.js";
import {
  CreateReservationDto,
  PreviewReservationDto,
} from "./dto/create-reservation.dto.js";

@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // POST /reservations/preview — fare estimate, no reservation created (200)
  @Post("preview")
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: PreviewReservationDto) {
    return this.reservationsService.preview(dto);
  }

  // POST /reservations — create reservation with real fare (201)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.reservationsService.findOne(id);
  }
}
