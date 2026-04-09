import { PropertiesController } from "./properties.controller";
import type { PropertiesService } from "./properties.service";

const PUBLIC_PROPERTY = {
  id: "prop-1",
  name: "Hotel Sol",
  type: "hotel",
  city: "Cancún",
  stars: 4,
  status: "active",
  countryCode: "MX",
  partnerId: "partner-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  rooms: [],
};

function makeController(overrides: Partial<PropertiesService> = {}) {
  const service = {
    create: jest.fn().mockResolvedValue(PUBLIC_PROPERTY),
    findAll: jest.fn().mockResolvedValue([PUBLIC_PROPERTY]),
    findDetail: jest.fn().mockResolvedValue(PUBLIC_PROPERTY),
    update: jest.fn().mockResolvedValue(PUBLIC_PROPERTY),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as PropertiesService;
  return { controller: new PropertiesController(service), service };
}

describe("PropertiesController", () => {
  it("create — delegates to service.create", async () => {
    const { controller, service } = makeController();
    const result = await controller.create({
      partnerId: "partner-1",
      name: "Hotel Sol",
      type: "hotel",
      city: "Cancún",
      countryCode: "MX",
    });
    expect(service.create).toHaveBeenCalledWith(
      "partner-1",
      expect.objectContaining({ name: "Hotel Sol" }),
    );
    expect(result.id).toBe("prop-1");
  });

  it("findAll — delegates to service.findAll with optional filters", async () => {
    const { controller, service } = makeController();
    const result = await controller.findAll("partner-1", "Cancún", "active");
    expect(service.findAll).toHaveBeenCalledWith(
      "partner-1",
      "Cancún",
      "active",
    );
    expect(result).toHaveLength(1);
  });

  it("findOne — delegates to service.findDetail", async () => {
    const { controller, service } = makeController();
    const result = await controller.findOne("prop-1");
    expect(service.findDetail).toHaveBeenCalledWith("prop-1");
    expect(result.id).toBe("prop-1");
  });

  it("update — delegates to service.update", async () => {
    const { controller, service } = makeController();
    await controller.update("prop-1", { city: "CDMX" });
    expect(service.update).toHaveBeenCalledWith("prop-1", { city: "CDMX" });
  });

  it("remove — delegates to service.remove", async () => {
    const { controller, service } = makeController();
    await controller.remove("prop-1");
    expect(service.remove).toHaveBeenCalledWith("prop-1");
  });
});
