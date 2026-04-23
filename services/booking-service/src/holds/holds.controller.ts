import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { HoldsService } from "./holds.service.js";
import { CreateHoldDto } from "./dto/create-hold.dto.js";

@Controller("holds")
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  // POST /holds — place a room hold at room-selection time
  // Returns 201 for a new hold, 200 for an idempotent duplicate
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHoldDto) {
    return this.holdsService.create(dto);
  }

  // DELETE /holds/:holdId — explicitly release a hold (e.g. user navigates away)
  @Delete(":holdId")
  @HttpCode(HttpStatus.NO_CONTENT)
  release(@Param("holdId") holdId: string) {
    return this.holdsService.release(holdId);
  }
}
