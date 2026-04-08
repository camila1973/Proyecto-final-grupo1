import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { TaxRulesRepository } from "../tax-rules/tax-rules.repository.js";
import { PartnerFeesRepository } from "../partner-fees/partner-fees.repository.js";
import { PriceValidationCacheRepository } from "../price-validation-cache/price-validation-cache.repository.js";

export interface FareInput {
  propertyId: string;
  roomId: string;
  partnerId: string;
  checkIn: Date;
  checkOut: Date;
  propertyLocation: { country: string; city: string };
  // Note: roomRateUsdPerNight is NOT an input — resolved internally from price_validation_cache
}

export interface TaxLineItem {
  name: string;
  type: string;
  rate?: number;
  amountUsd: number;
}

export interface FeeLineItem {
  name: string;
  type: string;
  rate?: number;
  amountUsd: number;
  totalUsd: number;
}

export interface FareBreakdown {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: TaxLineItem[];
  fees: FeeLineItem[];
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

const CALCULATION_TIMEOUT_MS = 500;

@Injectable()
export class FareCalculatorService {
  constructor(
    private readonly priceCache: PriceValidationCacheRepository,
    private readonly taxRulesRepo: TaxRulesRepository,
    private readonly partnerFeesRepo: PartnerFeesRepository,
  ) {}

  async calculate(input: FareInput): Promise<FareBreakdown> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new InternalServerErrorException(
              "Fare calculation timed out after 500ms",
            ),
          ),
        CALCULATION_TIMEOUT_MS,
      ),
    );

    return Promise.race([this.doCalculate(input), timeoutPromise]);
  }

  private async doCalculate(input: FareInput): Promise<FareBreakdown> {
    const nights = this.calculateNights(input.checkIn, input.checkOut);
    const checkInStr = input.checkIn.toISOString().slice(0, 10);
    const checkOutStr = input.checkOut.toISOString().slice(0, 10);

    // Step 2: Resolve room rate — FAIL FAST if not found
    const priceRow = await this.priceCache.findCoveringStay(
      input.roomId,
      input.checkIn,
      input.checkOut,
    );

    if (!priceRow) {
      throw new NotFoundException(
        `No cached price found for room ${input.roomId} covering ${checkInStr} to ${checkOutStr}. ` +
          `Ensure inventory.price.updated events have been received.`,
      );
    }

    const roomRateUsd = parseFloat(priceRow.price_usd);
    const subtotalUsd = round2(roomRateUsd * nights);

    // Step 4: Apply taxes — FAIL FAST on error
    const taxRules = await this.taxRulesRepo.findApplicable(
      input.propertyLocation.country,
      input.propertyLocation.city,
      input.checkIn,
    );

    const taxes: TaxLineItem[] = taxRules.map((rule) => {
      const amountUsd = this.computeAmount(
        rule.tax_type,
        rule.rate,
        rule.flat_amount,
        rule.currency,
        subtotalUsd,
        nights,
      );
      const item: TaxLineItem = {
        name: rule.tax_name,
        type: rule.tax_type,
        amountUsd,
      };
      if (rule.rate !== null) item.rate = parseFloat(rule.rate);
      return item;
    });

    // Step 5: Apply partner fees
    const partnerFees = await this.partnerFeesRepo.findApplicable(
      input.partnerId,
      input.propertyId,
      input.checkIn,
      input.checkOut,
    );

    const fees: FeeLineItem[] = partnerFees.map((fee) => {
      const amountUsd = this.computeAmount(
        fee.fee_type,
        fee.rate,
        fee.flat_amount,
        fee.currency,
        subtotalUsd,
        nights,
      );
      const item: FeeLineItem = {
        name: fee.fee_name,
        type: fee.fee_type,
        amountUsd,
        totalUsd: amountUsd,
      };
      if (fee.rate !== null) item.rate = parseFloat(fee.rate);
      return item;
    });

    const taxTotalUsd = round2(taxes.reduce((s, t) => s + t.amountUsd, 0));
    const feeTotalUsd = round2(fees.reduce((s, f) => s + f.amountUsd, 0));
    const totalUsd = round2(subtotalUsd + taxTotalUsd + feeTotalUsd);

    return {
      nights,
      roomRateUsd,
      subtotalUsd,
      taxes,
      fees,
      taxTotalUsd,
      feeTotalUsd,
      totalUsd,
    };
  }

  private computeAmount(
    type: string,
    rate: string | null,
    flatAmount: string | null,
    currency: string,
    subtotalUsd: number,
    nights: number,
  ): number {
    switch (type) {
      case "PERCENTAGE":
        return round2(subtotalUsd * (parseFloat(rate!) / 100));
      case "FLAT_PER_NIGHT":
        return round2(this.toUsd(parseFloat(flatAmount!), currency) * nights);
      case "FLAT_PER_STAY":
        return round2(this.toUsd(parseFloat(flatAmount!), currency));
      default:
        throw new InternalServerErrorException(`Unknown rate type: ${type}`);
    }
  }

  private toUsd(amount: number, currency: string): number {
    if (currency === "USD") return amount;
    // FX conversion is a hard project requirement — throw for unsupported currencies
    throw new InternalServerErrorException(
      `FX conversion not yet supported for currency: ${currency}`,
    );
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
