import { Injectable, Logger } from "@nestjs/common";
import {
  PropertiesRepository,
  type RoomIndexRecord,
} from "../../properties/properties.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";
import { BookingClientService } from "../../booking/booking-client.service.js";

export interface RoomUpsertedPayload {
  roomId: string;
  propertyId: string;
  partnerId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  amenities: string[];
  stars: number | null;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  isActive: boolean;
}

@Injectable()
export class RoomUpsertedHandler {
  private readonly logger = new Logger(RoomUpsertedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly properties: PropertiesService,
    private readonly bookingClient: BookingClientService,
  ) {}

  async handle(payload: RoomUpsertedPayload): Promise<void> {
    // Fetch tax rules from booking-service and apply city-wins precedence
    let taxRatePct = 0;
    try {
      const allRules = await this.bookingClient.getTaxRules(payload.country);
      const activeRules = allRules.filter((r) => r.is_active);
      const byName = new Map<string, (typeof activeRules)[number]>();
      for (const r of activeRules)
        if (r.city === null) byName.set(r.tax_name, r);
      for (const r of activeRules)
        if (r.city !== null) byName.set(r.tax_name, r);
      const normalizedCity = payload.city.toLowerCase();
      taxRatePct = [...byName.values()]
        .filter(
          (r) =>
            r.tax_type === "PERCENTAGE" &&
            (r.city === null || r.city.toLowerCase() === normalizedCity),
        )
        .reduce((acc, r) => acc + parseFloat(r.rate ?? "0"), 0);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch tax rules for ${payload.country}; defaulting to 0%: ${String(err)}`,
      );
    }

    // Fetch partner fees from booking-service and aggregate flat fee totals
    let flatFeePerNightUsd = 0;
    let flatFeePerStayUsd = 0;
    try {
      const allFees = await this.bookingClient.getPartnerFees(
        payload.partnerId,
      );
      const activeFlatFees = allFees.filter(
        (f) =>
          f.is_active &&
          (f.fee_type === "FLAT_PER_NIGHT" || f.fee_type === "FLAT_PER_STAY"),
      );
      flatFeePerNightUsd = activeFlatFees
        .filter((f) => f.fee_type === "FLAT_PER_NIGHT")
        .reduce((acc, f) => acc + parseFloat(f.flat_amount ?? "0"), 0);
      flatFeePerStayUsd = activeFlatFees
        .filter((f) => f.fee_type === "FLAT_PER_STAY")
        .reduce((acc, f) => acc + parseFloat(f.flat_amount ?? "0"), 0);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch partner fees for ${payload.partnerId}; defaulting flat fees to 0: ${String(err)}`,
      );
    }

    const record: RoomIndexRecord = {
      room_id: payload.roomId,
      property_id: payload.propertyId,
      partner_id: payload.partnerId,
      property_name: payload.propertyName,
      city: payload.city,
      country: payload.country,
      neighborhood: payload.neighborhood,
      lat: payload.lat ?? 0,
      lon: payload.lon ?? 0,
      room_type: payload.roomType,
      bed_type: payload.bedType,
      view_type: payload.viewType,
      capacity: payload.capacity,
      amenities: payload.amenities,
      base_price_usd: payload.basePriceUsd,
      tax_rate_pct: taxRatePct,
      flat_fee_per_night_usd: flatFeePerNightUsd,
      flat_fee_per_stay_usd: flatFeePerStayUsd,
      stars: payload.stars ?? 0,
      rating: payload.rating,
      review_count: payload.reviewCount,
      thumbnail_url: payload.thumbnailUrl,
      is_active: payload.isActive,
    };
    await this.repo.upsertRoom(record);
    await this.properties.invalidateCityCache(payload.city);
    this.logger.debug(
      `Upserted room ${payload.roomId} for city ${payload.city} (tax=${taxRatePct}%, flatNight=${flatFeePerNightUsd}, flatStay=${flatFeePerStayUsd})`,
    );
  }
}
