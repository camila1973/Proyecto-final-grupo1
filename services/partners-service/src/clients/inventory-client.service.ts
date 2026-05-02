import { Injectable, Logger } from "@nestjs/common";

export interface InventoryProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  countryCode: string;
  neighborhood: string | null;
  stars: number | null;
  status: string;
  partnerId: string;
  thumbnailUrl: string;
  createdAt: string;
}

@Injectable()
export class InventoryClientService {
  private readonly logger = new Logger(InventoryClientService.name);
  private readonly baseUrl =
    process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";

  async listPropertiesByPartner(
    partnerId: string,
  ): Promise<InventoryProperty[]> {
    const url = new URL(`${this.baseUrl}/properties`);
    url.searchParams.set("partnerId", partnerId);
    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(
        `inventory-service list properties failed for partner ${partnerId} [${res.status}]`,
      );
      return [];
    }
    const data = (await res.json()) as
      | InventoryProperty[]
      | { properties?: InventoryProperty[] };
    return Array.isArray(data) ? data : (data.properties ?? []);
  }
}
