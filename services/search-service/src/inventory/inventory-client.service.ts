import { Injectable } from "@nestjs/common";

@Injectable()
export class InventoryClientService {
  private readonly baseUrl =
    process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";

  async checkAvailability(params: {
    roomIds: string[];
    fromDate: string;
    toDate: string;
  }): Promise<Array<{ roomId: string }>> {
    const url = new URL(`${this.baseUrl}/availability`);
    url.searchParams.set("roomId", params.roomIds.join(","));
    url.searchParams.set("fromDate", params.fromDate);
    url.searchParams.set("toDate", params.toDate);

    const res = await fetch(url.toString());

    if (!res.ok)
      throw new Error(`inventory availability check failed: ${res.status}`);

    const results = (await res.json()) as Array<{
      roomId: string;
      available: boolean;
    }>;
    return results
      .filter((r) => r.available)
      .map((r) => ({ roomId: r.roomId }));
  }
}
