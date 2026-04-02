import { Injectable } from "@nestjs/common";
import { AvailabilityRepository } from "./availability.repository";
import {
  AvailabilityDayDto,
  BulkAvailabilityResult,
  BlockDatesDto,
  ReduceCapacityDto,
} from "./availability.types";
import { RoomsService } from "../rooms/rooms.service";

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly repo: AvailabilityRepository,
    private readonly roomsService: RoomsService,
  ) {}

  // Partner-facing: per-date calendar
  async getByRoom(
    roomId: string,
    partnerId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityDayDto[]> {
    await this.roomsService.findOne(roomId);
    return this.repo.getAvailability(roomId, fromDate, toDate);
  }

  // Internal: per-date calendar (no ownership check)
  async getByRoomInternal(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityDayDto[]> {
    return this.repo.getAvailability(roomId, fromDate, toDate);
  }

  // Internal: bulk check for search-service
  async bulkCheck(
    roomIds: string[],
    fromDate: string,
    toDate: string,
  ): Promise<BulkAvailabilityResult[]> {
    if (roomIds.length === 0) return [];
    const results: BulkAvailabilityResult[] = [];
    for (const roomId of roomIds) {
      const days = await this.repo.getAvailability(roomId, fromDate, toDate);
      const available = days.length > 0 && days.every((d) => d.available);
      results.push({ roomId, available });
    }
    return results;
  }

  async reduceCapacity(
    partnerId: string,
    dto: ReduceCapacityDto,
  ): Promise<void> {
    await this.roomsService.findOne(dto.roomId);
    await this.repo.reduceCapacity(
      dto.roomId,
      dto.fromDate,
      dto.toDate,
      dto.totalRooms,
    );
  }

  async blockDates(
    roomId: string,
    partnerId: string,
    dto: BlockDatesDto,
  ): Promise<void> {
    await this.roomsService.findOne(roomId);
    await this.repo.blockDates(roomId, dto.fromDate, dto.toDate);
  }

  async unblockDates(
    roomId: string,
    partnerId: string,
    dto: BlockDatesDto,
  ): Promise<void> {
    await this.roomsService.findOne(roomId);
    await this.repo.unblockDates(roomId, dto.fromDate, dto.toDate);
  }

  // Internal — called by booking-service
  async hold(roomId: string, fromDate: string, toDate: string): Promise<void> {
    await this.repo.hold(roomId, fromDate, toDate);
  }

  async unhold(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.repo.unhold(roomId, fromDate, toDate);
  }

  async confirm(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.repo.confirm(roomId, fromDate, toDate);
  }

  async release(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.repo.release(roomId, fromDate, toDate);
  }
}
