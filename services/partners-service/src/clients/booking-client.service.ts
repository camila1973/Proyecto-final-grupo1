import { Injectable, Logger } from "@nestjs/common";

interface FeeData {
  id?: string;
  partnerId: string;
  propertyId?: string;
  feeName: string;
  feeType: string;
  rate?: number;
  flatAmount?: number;
  currency?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

@Injectable()
export class BookingClientService {
  private readonly logger = new Logger(BookingClientService.name);
  private readonly baseUrl =
    process.env.BOOKING_SERVICE_URL ?? "http://localhost:3004";

  async upsertFee(data: FeeData): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/internal/fees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `booking-service upsert fee failed [${res.status}]: ${body}`,
      );
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  async listFees(partnerId: string): Promise<Record<string, unknown>[]> {
    const url = new URL(`${this.baseUrl}/internal/fees`);
    url.searchParams.set("partnerId", partnerId);
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`booking-service list fees failed [${res.status}]`);
    }
    return res.json() as Promise<Record<string, unknown>[]>;
  }

  async deleteFee(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/internal/fees/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`booking-service delete fee failed [${res.status}]`);
    }
  }
}
