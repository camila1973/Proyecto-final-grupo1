import { Injectable, Logger } from "@nestjs/common";
import { CommissionRulesRepository } from "./commission-rules.repository.js";

export interface ResolvedCommission {
  partnerId: string;
  ratePct: number;
  source: "partner" | "global" | "fallback";
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

@Injectable()
export class CommissionRulesService {
  private readonly logger = new Logger(CommissionRulesService.name);
  private static readonly FALLBACK_RATE = 0.2;

  constructor(private readonly repo: CommissionRulesRepository) {}

  async resolveRate(partnerId: string, onDate: string): Promise<number> {
    const rule = await this.repo.findApplicable(partnerId, onDate);
    if (!rule) {
      this.logger.warn(
        `No commission rule for partner ${partnerId} on ${onDate}; using fallback ${CommissionRulesService.FALLBACK_RATE}`,
      );
      return CommissionRulesService.FALLBACK_RATE;
    }
    return parseFloat(rule.rate);
  }

  async resolveDetailed(
    partnerId: string,
    onDate: string,
  ): Promise<ResolvedCommission> {
    const rule = await this.repo.findApplicable(partnerId, onDate);
    if (!rule) {
      this.logger.warn(
        `No commission rule for partner ${partnerId} on ${onDate}; using fallback ${CommissionRulesService.FALLBACK_RATE}`,
      );
      return {
        partnerId,
        ratePct: CommissionRulesService.FALLBACK_RATE * 100,
        source: "fallback",
        effectiveFrom: null,
        effectiveTo: null,
      };
    }
    return {
      partnerId,
      ratePct: parseFloat(rule.rate) * 100,
      source: rule.partner_id === partnerId ? "partner" : "global",
      effectiveFrom: toIsoDate(rule.effective_from),
      effectiveTo: toIsoDate(rule.effective_to),
    };
  }
}

function toIsoDate(value: string | Date | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}
