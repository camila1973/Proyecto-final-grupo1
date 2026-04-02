import { Test, TestingModule } from "@nestjs/testing";
import { PropertyHandler } from "./property.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = {
  resolve: jest.fn(),
  register: jest.fn(),
};
const mockInventoryClient = {
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
};

function makeValidPropertyData(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "ext-prop-1",
    name: "Hotel Test",
    type: "hotel",
    city: "New York",
    countryCode: "US",
    ...overrides,
  };
}

describe("PropertyHandler", () => {
  let handler: PropertyHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: InventoryClient, useValue: mockInventoryClient },
      ],
    }).compile();
    handler = module.get<PropertyHandler>(PropertyHandler);
  });

  describe("property.created", () => {
    it("creates property when no existing mapping", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);
      mockInventoryClient.createProperty.mockResolvedValue({
        id: "internal-prop-1",
      });
      mockExternalIdService.register.mockResolvedValue(undefined);

      await handler.handle(
        "partner-1",
        "property.created",
        makeValidPropertyData(),
      );

      expect(mockInventoryClient.createProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Hotel Test",
          type: "hotel",
          city: "New York",
          countryCode: "US",
          partnerId: "partner-1",
        }),
      );
      expect(mockExternalIdService.register).toHaveBeenCalledWith(
        "partner-1",
        "property",
        "ext-prop-1",
        "internal-prop-1",
      );
    });

    it("returns early (idempotent) when property already mapped", async () => {
      mockExternalIdService.resolve.mockResolvedValue("existing-prop-id");

      await handler.handle(
        "partner-1",
        "property.created",
        makeValidPropertyData(),
      );

      expect(mockInventoryClient.createProperty).not.toHaveBeenCalled();
    });
  });

  describe("property.updated", () => {
    it("updates property when mapping is known", async () => {
      mockExternalIdService.resolve.mockResolvedValue("internal-prop-1");
      mockInventoryClient.updateProperty.mockResolvedValue(undefined);

      await handler.handle(
        "partner-1",
        "property.updated",
        makeValidPropertyData(),
      );

      expect(mockInventoryClient.updateProperty).toHaveBeenCalledWith(
        "internal-prop-1",
        expect.objectContaining({ name: "Hotel Test", type: "hotel" }),
      );
    });

    it("throws UnknownEntityError when mapping not found", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);

      await expect(
        handler.handle(
          "partner-1",
          "property.updated",
          makeValidPropertyData(),
        ),
      ).rejects.toThrow(UnknownEntityError);
    });
  });

  it("throws validation error when required field is missing", async () => {
    const invalidData = { externalId: "ext-prop-1" }; // missing name, type, city, countryCode

    await expect(
      handler.handle("partner-1", "property.created", invalidData),
    ).rejects.toBeDefined();
  });
});
