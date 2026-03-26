import { TaxonomyUpdatedHandler } from "./taxonomy-updated.handler.js";
import type { TaxonomiesService } from "../../taxonomies/taxonomies.service.js";

describe("TaxonomyUpdatedHandler", () => {
  let handler: TaxonomyUpdatedHandler;
  let taxonomies: jest.Mocked<Pick<TaxonomiesService, "invalidateCache">>;

  beforeEach(() => {
    taxonomies = { invalidateCache: jest.fn().mockResolvedValue(undefined) };
    handler = new TaxonomyUpdatedHandler(
      taxonomies as unknown as TaxonomiesService,
    );
  });

  it("calls taxonomies.invalidateCache", async () => {
    await handler.handle();
    expect(taxonomies.invalidateCache).toHaveBeenCalledTimes(1);
  });
});
