import { NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import { PropertyCheckinKeyController } from "./property-checkin-key.controller.js";
import type { PropertyCheckinKeyService } from "./property-checkin-key.service.js";

const mockRes = {} as unknown as Response;

function makeService(): jest.Mocked<
  Pick<
    PropertyCheckinKeyService,
    "findKey" | "regenerateKey" | "generateCheckinPdf"
  >
> {
  return {
    findKey: jest.fn(),
    regenerateKey: jest.fn(),
    generateCheckinPdf: jest.fn(),
  };
}

const PARTNER_ID = "a1000000-0000-0000-0000-000000000001";
const PROPERTY_ID = "b1000000-0000-0000-0000-000000000001";
const CHECK_IN_KEY = "abc123def456";
const QR_RESPONSE = {
  partnerId: PARTNER_ID,
  propertyId: PROPERTY_ID,
  checkInKey: CHECK_IN_KEY,
};

describe("PropertyCheckinKeyController", () => {
  let controller: PropertyCheckinKeyController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new PropertyCheckinKeyController(
      service as unknown as PropertyCheckinKeyService,
    );
  });

  // ─── getCheckinPublicKey ──────────────────────────────────────────────────────

  describe("getCheckinPublicKey", () => {
    it("delegates to service.findKey and returns the result", async () => {
      service.findKey.mockResolvedValue(QR_RESPONSE);

      const result = await controller.getCheckinPublicKey(
        PARTNER_ID,
        PROPERTY_ID,
      );

      expect(service.findKey).toHaveBeenCalledWith(PARTNER_ID, PROPERTY_ID);
      expect(result).toEqual(QR_RESPONSE);
    });

    it("propagates NotFoundException from service", async () => {
      service.findKey.mockRejectedValue(new NotFoundException("No key"));

      await expect(
        controller.getCheckinPublicKey(PARTNER_ID, PROPERTY_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── regenerateCheckinPublicKey ───────────────────────────────────────────────

  describe("regenerateCheckinPublicKey", () => {
    it("delegates to service.regenerateKey and returns new key", async () => {
      const newResponse = { ...QR_RESPONSE, checkInKey: "newkey" };
      service.regenerateKey.mockResolvedValue(newResponse);

      const result = await controller.regenerateCheckinPublicKey(
        PARTNER_ID,
        PROPERTY_ID,
      );

      expect(service.regenerateKey).toHaveBeenCalledWith(
        PARTNER_ID,
        PROPERTY_ID,
      );
      expect(result).toEqual(newResponse);
    });

    it("propagates NotFoundException when no active key exists", async () => {
      service.regenerateKey.mockRejectedValue(new NotFoundException("No key"));

      await expect(
        controller.regenerateCheckinPublicKey(PARTNER_ID, PROPERTY_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── downloadCheckinPublicKey ─────────────────────────────────────────────────

  describe("downloadCheckinPublicKey", () => {
    it("delegates to service.generateCheckinPdf with the response object", async () => {
      service.generateCheckinPdf.mockResolvedValue(undefined);
      await controller.downloadCheckinPublicKey(
        PARTNER_ID,
        PROPERTY_ID,
        mockRes,
      );

      expect(service.generateCheckinPdf).toHaveBeenCalledWith(
        PARTNER_ID,
        PROPERTY_ID,
        mockRes,
      );
    });

    it("propagates NotFoundException when no active key exists", async () => {
      service.generateCheckinPdf.mockRejectedValue(
        new NotFoundException("No key"),
      );

      await expect(
        controller.downloadCheckinPublicKey(PARTNER_ID, PROPERTY_ID, mockRes),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getCheckinKey (internal) ─────────────────────────────────────────────────

  describe("getCheckinKey", () => {
    it("returns only checkInKey from service.findKey result", async () => {
      service.findKey.mockResolvedValue(QR_RESPONSE);

      const result = await controller.getCheckinKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toEqual({ checkInKey: CHECK_IN_KEY });
      expect(service.findKey).toHaveBeenCalledWith(PARTNER_ID, PROPERTY_ID);
    });

    it("propagates NotFoundException from service", async () => {
      service.findKey.mockRejectedValue(new NotFoundException("No key"));

      await expect(
        controller.getCheckinKey(PARTNER_ID, PROPERTY_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
