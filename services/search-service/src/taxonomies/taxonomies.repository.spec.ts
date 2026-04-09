import { TaxonomiesRepository } from "./taxonomies.repository.js";
import type { Kysely } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";

function makeQueryChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {
    selectAll: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    execute: jest.fn().mockResolvedValue(result),
  };
  chain.selectAll.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

const fakeCategories = [
  {
    id: "cat1",
    code: "room_type",
    label: "Room Type",
    filter_type: "checkbox",
    display_order: 1,
    is_active: true,
    created_at: "",
  },
];

const fakeValues = [
  {
    id: "val1",
    category_id: "cat1",
    code: "suite",
    label: "Suite",
    display_order: 1,
    is_active: true,
    created_at: "",
  },
];

describe("TaxonomiesRepository", () => {
  let repo: TaxonomiesRepository;
  let selectFrom: jest.Mock;

  beforeEach(() => {
    selectFrom = jest
      .fn()
      .mockReturnValueOnce(makeQueryChain(fakeCategories))
      .mockReturnValueOnce(makeQueryChain(fakeValues));

    const db = { selectFrom } as unknown as Kysely<SearchDatabase>;
    repo = new TaxonomiesRepository(db);
  });

  it("findActiveCategories returns active categories ordered by display_order", async () => {
    const result = await repo.findActiveCategories();
    expect(result).toEqual(fakeCategories);
    expect(selectFrom).toHaveBeenCalledWith("taxonomy_categories");
  });

  it("findActiveValues returns active values ordered by display_order", async () => {
    await repo.findActiveCategories(); // consume first mock
    const result = await repo.findActiveValues();
    expect(result).toEqual(fakeValues);
    expect(selectFrom).toHaveBeenCalledWith("taxonomy_values");
  });
});
