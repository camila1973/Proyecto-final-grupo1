import { Injectable } from '@nestjs/common';

export interface AvailabilityRecord {
  skuId: string; // `${propertyId}:${roomId}:${date}`
  propertyId: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  allotment: number;
  price: number;
  currency: string;
  stopSell: boolean;
  updatedAt: Date;
  source: string; // provider name
}

@Injectable()
export class AvailabilityStore {
  private readonly store = new Map<string, AvailabilityRecord>();

  upsert(record: AvailabilityRecord): void {
    this.store.set(record.skuId, record);
  }

  upsertBatch(records: AvailabilityRecord[]): void {
    for (const record of records) {
      this.store.set(record.skuId, record);
    }
  }

  get(skuId: string): AvailabilityRecord | undefined {
    return this.store.get(skuId);
  }

  getByProperty(propertyId: string): AvailabilityRecord[] {
    const result: AvailabilityRecord[] = [];
    for (const record of this.store.values()) {
      if (record.propertyId === propertyId) {
        result.push(record);
      }
    }
    return result;
  }

  size(): number {
    return this.store.size;
  }
}
