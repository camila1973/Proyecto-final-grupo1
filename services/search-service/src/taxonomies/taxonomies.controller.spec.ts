import { TaxonomiesController } from "./taxonomies.controller.js";
import type { TaxonomiesService } from "./taxonomies.service.js";

describe("TaxonomiesController", () => {
  let controller: TaxonomiesController;
  let service: jest.Mocked<Pick<TaxonomiesService, "getTaxonomies">>;

  beforeEach(() => {
    service = {
      getTaxonomies: jest.fn().mockResolvedValue({ categories: [] }),
    };
    controller = new TaxonomiesController(
      service as unknown as TaxonomiesService,
    );
  });

  it("delegates to getTaxonomies and returns the result", async () => {
    const result = await controller.getTaxonomies();
    expect(service.getTaxonomies).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ categories: [] });
  });
});
