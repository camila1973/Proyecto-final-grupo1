export class CreateFeeDto {
  partnerId!: string;
  propertyId?: string;
  feeName!: string;
  feeType!: "PERCENTAGE" | "FLAT_PER_NIGHT" | "FLAT_PER_STAY";
  rate?: number;
  flatAmount?: number;
  currency?: string;
  effectiveFrom!: string;
  effectiveTo?: string;
}
