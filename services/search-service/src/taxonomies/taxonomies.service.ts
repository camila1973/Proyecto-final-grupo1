import { Injectable } from "@nestjs/common";
import { TaxonomiesRepository } from "./taxonomies.repository.js";
import { CacheService } from "../cache/cache.service.js";

const CACHE_KEY = "search:taxonomies";
const CACHE_TTL = 60 * 60 * 24; // 24 hours

@Injectable()
export class TaxonomiesService {
  constructor(
    private readonly repo: TaxonomiesRepository,
    private readonly cache: CacheService,
  ) {}

  async getTaxonomies() {
    const cached = await this.cache.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const categories = await this.repo.findActiveCategories();
    const values = await this.repo.findActiveValues();

    const valuesByCategory = new Map<string, typeof values>();
    for (const v of values) {
      const list = valuesByCategory.get(v.category_id) ?? [];
      list.push(v);
      valuesByCategory.set(v.category_id, list);
    }

    const response = {
      categories: categories.map((cat) => ({
        id: cat.id,
        code: cat.code,
        label: cat.label,
        filterType: cat.filter_type,
        displayOrder: cat.display_order,
        values: (valuesByCategory.get(cat.id) ?? []).map((v) => ({
          id: v.id,
          code: v.code,
          label: v.label,
          displayOrder: v.display_order,
        })),
      })),
    };

    await this.cache.set(CACHE_KEY, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async invalidateCache(): Promise<void> {
    await this.cache.del(CACHE_KEY);
  }
}
