import { Injectable, Logger } from "@nestjs/common";
import { CommissionRulesRepository } from "./commission-rules.repository.js";

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
}
