import { Injectable } from "@nestjs/common";

export interface TaxRuleDto {
  id: string;
  country: string;
  city: string | null;
  tax_name: string;
  tax_type: string;
  rate: string | null;
  flat_amount: string | null;
  currency: string;
  is_active: boolean;
}

export interface PartnerFeeDto {
  id: string;
  partner_id: string;
  fee_name: string;
  fee_type: string;
  rate: string | null;
  flat_amount: string | null;
  currency: string;
  is_active: boolean;
}

@Injectable()
export class BookingClientService {
  private readonly baseUrl =
    process.env.BOOKING_SERVICE_URL ?? "http://localhost:3004";

  async getTaxRules(country: string): Promise<TaxRuleDto[]> {
    const url = new URL(`${this.baseUrl}/tax-rules`);
    url.searchParams.set("country", country);

    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(`booking-service getTaxRules failed: ${res.status}`);

    return res.json() as Promise<TaxRuleDto[]>;
  }

  async getPartnerFees(partnerId: string): Promise<PartnerFeeDto[]> {
    const url = new URL(`${this.baseUrl}/internal/fees`);
    url.searchParams.set("partnerId", partnerId);

    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(`booking-service getPartnerFees failed: ${res.status}`);

    return res.json() as Promise<PartnerFeeDto[]>;
  }
}
