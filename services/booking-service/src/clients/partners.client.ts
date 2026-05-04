import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { UpstreamServiceError } from "./upstream-service.error.js";

@Injectable()
export class PartnersClient {
  private readonly logger = new Logger(PartnersClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env["PARTNERS_SERVICE_URL"] ?? "http://localhost:3007";
  }

  async getCheckinKey(
    partnerId: string,
    propertyId: string,
  ): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ checkInKey: string }>(
          `${this.baseUrl}/internal/partners/${partnerId}/properties/${propertyId}/checkin-publickey`,
        ),
      );
      return res.data.checkInKey;
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      if (status === 404) return null;
      this.logger.error(
        `getCheckinKey failed for partner ${partnerId} / property ${propertyId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("partners-service", err);
    }
  }
}
