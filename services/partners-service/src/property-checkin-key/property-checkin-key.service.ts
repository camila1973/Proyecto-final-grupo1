import { Injectable, NotFoundException } from "@nestjs/common";
import { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";

@Injectable()
export class PropertyCheckinKeyService {
  constructor(private readonly repo: PropertyCheckinKeyRepository) {}

  async findKey(
    partnerId: string,
    propertyId: string,
  ): Promise<{ partnerId: string; propertyId: string; checkInKey: string }> {
    const checkInKey = await this.repo.findActiveKey(partnerId, propertyId);
    if (!checkInKey) {
      throw new NotFoundException(
        `No active check-in key for partner ${partnerId} / property ${propertyId}`,
      );
    }
    return { partnerId, propertyId, checkInKey };
  }
}
