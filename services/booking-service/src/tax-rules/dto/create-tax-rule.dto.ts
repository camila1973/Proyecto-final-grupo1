export class CreateTaxRuleDto {
  country!: string;
  city?: string;
  taxName!: string;
  taxType!: "PERCENTAGE" | "FLAT_PER_NIGHT" | "FLAT_PER_STAY";
  rate?: number;
  flatAmount?: number;
  currency?: string;
  effectiveFrom!: string;
  effectiveTo?: string;
}
