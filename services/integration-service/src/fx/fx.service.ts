import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(private readonly httpService: HttpService) {}

  async convertToUsd(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency.toUpperCase() === "USD") {
      return amount;
    }

    const isMock = process.env.FX_MOCK !== "false";
    if (isMock) {
      this.logger.warn(
        `FX_MOCK=true: returning amount ${amount} ${fromCurrency} as-is (treating as USD)`,
      );
      return amount;
    }

    const paymentServiceUrl =
      process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3005";
    const response = await firstValueFrom(
      this.httpService.post<{ amountUsd: number }>(
        `${paymentServiceUrl}/fx/convert`,
        { amount, from: fromCurrency, to: "USD" },
      ),
    );
    return response.data.amountUsd;
  }
}
