import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ReservationsService } from "./reservations.service.js";
import {
  CreateReservationDto,
  GuestInfoDto,
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

  // POST /reservations — 201 when created, 200 when returning an existing hold
  @Post()
  async create(
    @Body() dto: CreateReservationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reservationsService.create(dto);
    const { created, ...data } = result;
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return data;
  }

  @Get()
  findAll(@Query("bookerId") bookerId?: string) {
    return this.reservationsService.findAll(bookerId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(":id/submit")
  @HttpCode(HttpStatus.OK)
  submit(@Param("id") id: string) {
    return this.reservationsService.submit(id);
  }

  @Patch(":id/fail")
  @HttpCode(HttpStatus.OK)
  fail(@Param("id") id: string, @Body() body: { reason: string }) {
    return this.reservationsService.fail(id, body.reason);
  }

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id") id: string, @Body() body: { reason: string }) {
    return this.reservationsService.cancel(id, body.reason);
  }

  @Patch(":id/rehold")
  @HttpCode(HttpStatus.OK)
  rehold(@Param("id") id: string) {
    return this.reservationsService.rehold(id);
  }

  @Patch(":id/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@Param("id") id: string) {
    return this.reservationsService.confirm(id);
  }

  @Patch(":id/check-in")
  @HttpCode(HttpStatus.OK)
  checkIn(@Param("id") id: string) {
    return this.reservationsService.checkIn(id);
  }

  @Patch(":id/check-out")
  @HttpCode(HttpStatus.OK)
  checkOut(@Param("id") id: string) {
    return this.reservationsService.checkOut(id);
  }

  @Patch(":id/partner-confirm")
  @HttpCode(HttpStatus.OK)
  partnerConfirm(@Param("id") id: string) {
    return this.reservationsService.partnerConfirm(id);
  }

  @Patch(":id/partner-cancel")
  @HttpCode(HttpStatus.OK)
  partnerCancel(@Param("id") id: string, @Body() body: { reason: string }) {
    return this.reservationsService.partnerCancel(id, body.reason);
  }

  @Patch(":id/guest-info")
  @HttpCode(HttpStatus.OK)
  updateGuestInfo(@Param("id") id: string, @Body() dto: GuestInfoDto) {
    return this.reservationsService.updateGuestInfo(id, dto);
  }
}
