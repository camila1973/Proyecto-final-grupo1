import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ReservationsService } from "./reservations.service.js";
import { BookingActor } from "../events/events.types.js";
import {
  CheckinDto,
  CreateReservationDto,
  GuestInfoDto,
  ModifyReservationDto,
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

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  modify(
    @Param("id") id: string,
    @Body() dto: ModifyReservationDto,
    @Headers("x-user-role") role: string,
  ) {
    const actor: BookingActor = role ? (role as BookingActor) : "guest";
    return this.reservationsService.modify(id, dto, actor);
  }

  @Get(":id/refund-quote")
  refundQuote(@Param("id") id: string) {
    return this.reservationsService.getRefundQuote(id);
  }

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @Headers("x-user-role") role: string,
    @Headers("x-user-id") userId: string,
    @Headers("x-forwarded-for") forwardedFor: string,
    @Ip() directIp: string,
  ) {
    const actor: BookingActor = role ? (role as BookingActor) : "system";
    // booking-service runs behind api-gateway; @Ip() resolves to the gateway
    // IP, not the original client. Prefer the left-most x-forwarded-for entry
    // when present so the audit log records the real caller.
    const fromHeader = forwardedFor?.split(",")[0]?.trim();
    return this.reservationsService.cancel(id, body.reason, actor, {
      actorId: userId || null,
      requestIp: fromHeader || directIp || null,
    });
  }

  @Patch(":id/rehold")
  @HttpCode(HttpStatus.OK)
  rehold(@Param("id") id: string) {
    return this.reservationsService.rehold(id);
  }

  @Patch(":id/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@Param("id") id: string, @Headers("x-user-role") role: string) {
    const actor: BookingActor = role ? (role as BookingActor) : "system";
    return this.reservationsService.confirm(id, actor);
  }

  @Patch(":id/check-in")
  @HttpCode(HttpStatus.OK)
  checkin(@Param("id") id: string, @Body() dto: CheckinDto) {
    return this.reservationsService.checkin(id, dto.checkInKey, dto.bookerId);
  }

  @Patch(":id/check-out")
  @HttpCode(HttpStatus.OK)
  checkOut(@Param("id") id: string) {
    return this.reservationsService.checkOut(id);
  }

  @Patch(":id/guest-info")
  @HttpCode(HttpStatus.OK)
  updateGuestInfo(@Param("id") id: string, @Body() dto: GuestInfoDto) {
    return this.reservationsService.updateGuestInfo(id, dto);
  }
}
