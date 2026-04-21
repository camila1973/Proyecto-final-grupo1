import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

export interface PropertyReviewRow {
  id: string;
  property_id: string;
  reviewer_name: string;
  reviewer_country: string | null;
  rating: number;
  language: string;
  title: string | null;
  comment: string;
  created_at: string;
}

export interface ReviewsAggregate {
  averageRating: number;
  totalReviews: number;
}

@Injectable()
export class ReviewsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async findByPropertyId(
    propertyId: string,
    opts: { page: number; pageSize: number; language?: string },
  ): Promise<PropertyReviewRow[]> {
    const offset = (opts.page - 1) * opts.pageSize;

    return (await this.db
      .selectFrom("property_reviews")
      .selectAll()
      .where("property_id", "=", propertyId)
      .$if(!!opts.language, (qb) => qb.where("language", "=", opts.language!))
      .orderBy("created_at", "desc")
      .limit(opts.pageSize)
      .offset(offset)
      .execute()) as PropertyReviewRow[];
  }

  async aggregate(
    propertyId: string,
    language?: string,
  ): Promise<ReviewsAggregate> {
    const row = await this.db
      .selectFrom("property_reviews")
      .select((eb) => [
        eb.fn.count("id").as("count"),
        eb.fn.avg("rating").as("avg"),
      ])
      .where("property_id", "=", propertyId)
      .$if(!!language, (qb) => qb.where("language", "=", language!))
      .executeTakeFirst();

    const totalReviews = Number(row?.count ?? 0);
    const averageRating =
      totalReviews > 0 ? parseFloat(String(row?.avg ?? 0)) : 0;
    return { averageRating, totalReviews };
  }
}
