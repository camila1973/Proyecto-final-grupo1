import { Controller, Get } from "@nestjs/common";
import { TaxonomiesService } from "./taxonomies.service.js";

@Controller()
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Get("taxonomies")
  getTaxonomies() {
    return this.taxonomiesService.getTaxonomies();
  }
}
