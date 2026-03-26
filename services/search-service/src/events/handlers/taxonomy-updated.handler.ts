import { Injectable, Logger } from "@nestjs/common";
import { TaxonomiesService } from "../../taxonomies/taxonomies.service.js";

@Injectable()
export class TaxonomyUpdatedHandler {
  private readonly logger = new Logger(TaxonomyUpdatedHandler.name);

  constructor(private readonly taxonomies: TaxonomiesService) {}

  async handle(): Promise<void> {
    await this.taxonomies.invalidateCache();
    this.logger.debug("Taxonomy cache invalidated");
  }
}
