import { NotFoundException } from "@nestjs/common";

// Mock pdfkit before importing the service (module-level LOGO_BUFFER + PDFDocument usage)
const mockDocInstance = {
  image: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  strokeColor: jest.fn().mockReturnThis(),
  lineWidth: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
  end: jest.fn(),
};

jest.mock("pdfkit", () => jest.fn().mockImplementation(() => mockDocInstance));

jest.mock("qrcode", () => ({
  toBuffer: jest.fn().mockResolvedValue(Buffer.from("fake-qr-data")),
}));

import { PropertyCheckinKeyService } from "./property-checkin-key.service.js";
import type { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";
import type { InventoryClientService } from "../clients/inventory-client.service.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<
  Pick<PropertyCheckinKeyRepository, "findActiveKey" | "rotateKey">
> {
  return {
    findActiveKey: jest.fn(),
    rotateKey: jest.fn(),
  };
}

function makeInventoryClient(): jest.Mocked<
  Pick<InventoryClientService, "getPropertyById">
> {
  return { getPropertyById: jest.fn() };
}

function makeRes() {
  return {
    setHeader: jest.fn(),
    pipe: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
}

const PARTNER_ID = "a1000000-0000-0000-0000-000000000001";
const PROPERTY_ID = "b1000000-0000-0000-0000-000000000001";
const CHECK_IN_KEY = "abc123def456";

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PropertyCheckinKeyService", () => {
  let service: PropertyCheckinKeyService;
  let repo: ReturnType<typeof makeRepo>;
  let inventoryClient: ReturnType<typeof makeInventoryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeRepo();
    inventoryClient = makeInventoryClient();
    service = new PropertyCheckinKeyService(
      repo as unknown as PropertyCheckinKeyRepository,
      inventoryClient as unknown as InventoryClientService,
    );
  });

  // ─── findKey ─────────────────────────────────────────────────────────────────

  describe("findKey", () => {
    it("returns partnerId, propertyId and checkInKey when key exists", async () => {
      repo.findActiveKey.mockResolvedValue(CHECK_IN_KEY);

      const result = await service.findKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toEqual({
        partnerId: PARTNER_ID,
        propertyId: PROPERTY_ID,
        checkInKey: CHECK_IN_KEY,
      });
      expect(repo.findActiveKey).toHaveBeenCalledWith(PARTNER_ID, PROPERTY_ID);
    });

    it("throws NotFoundException when no active key exists", async () => {
      repo.findActiveKey.mockResolvedValue(null);

      await expect(service.findKey(PARTNER_ID, PROPERTY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── regenerateKey ───────────────────────────────────────────────────────────

  describe("regenerateKey", () => {
    it("rotates the key and returns the new value", async () => {
      const newKey = "newkey64hexchars";
      repo.rotateKey.mockResolvedValue(newKey);

      const result = await service.regenerateKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toEqual({
        partnerId: PARTNER_ID,
        propertyId: PROPERTY_ID,
        checkInKey: newKey,
      });
      expect(repo.rotateKey).toHaveBeenCalledWith(
        PARTNER_ID,
        PROPERTY_ID,
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
    });

    it("throws NotFoundException when no active key exists to rotate", async () => {
      repo.rotateKey.mockResolvedValue(null);

      await expect(
        service.regenerateKey(PARTNER_ID, PROPERTY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("generates a 64-char hex key using randomBytes(32)", async () => {
      repo.rotateKey.mockResolvedValue("any-key");

      await service.regenerateKey(PARTNER_ID, PROPERTY_ID);

      const [, , passedKey] = repo.rotateKey.mock.calls[0];
      expect(passedKey).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ─── generateCheckinPdf ──────────────────────────────────────────────────────

  describe("generateCheckinPdf", () => {
    it("throws NotFoundException when no active key exists", async () => {
      repo.findActiveKey.mockResolvedValue(null);

      await expect(
        service.generateCheckinPdf(PARTNER_ID, PROPERTY_ID, makeRes() as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("sets Content-Type and Content-Disposition headers", async () => {
      repo.findActiveKey.mockResolvedValue(CHECK_IN_KEY);
      inventoryClient.getPropertyById.mockResolvedValue({
        id: PROPERTY_ID,
        name: "Hotel Cancún",
        type: "hotel",
        city: "Cancún",
        countryCode: "MX",
        neighborhood: null,
        stars: 5,
        status: "active",
        partnerId: PARTNER_ID,
        thumbnailUrl: "",
        createdAt: "2026-01-01",
      });
      const res = makeRes();

      await service.generateCheckinPdf(PARTNER_ID, PROPERTY_ID, res as any);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining(PROPERTY_ID),
      );
    });

    it("uses propertyId as fallback name when inventory returns null", async () => {
      repo.findActiveKey.mockResolvedValue(CHECK_IN_KEY);
      inventoryClient.getPropertyById.mockResolvedValue(null);
      const res = makeRes();

      await service.generateCheckinPdf(PARTNER_ID, PROPERTY_ID, res as any);

      expect(mockDocInstance.text).toHaveBeenCalledWith(
        PROPERTY_ID,
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("uses property name from inventory when available", async () => {
      repo.findActiveKey.mockResolvedValue(CHECK_IN_KEY);
      inventoryClient.getPropertyById.mockResolvedValue({
        id: PROPERTY_ID,
        name: "Hotel Cancún",
        type: "hotel",
        city: "Cancún",
        countryCode: "MX",
        neighborhood: null,
        stars: 5,
        status: "active",
        partnerId: PARTNER_ID,
        thumbnailUrl: "",
        createdAt: "2026-01-01",
      });
      const res = makeRes();

      await service.generateCheckinPdf(PARTNER_ID, PROPERTY_ID, res as any);

      expect(mockDocInstance.text).toHaveBeenCalledWith(
        "Hotel Cancún",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("pipes the document to the response and calls end", async () => {
      repo.findActiveKey.mockResolvedValue(CHECK_IN_KEY);
      inventoryClient.getPropertyById.mockResolvedValue(null);
      const res = makeRes();

      await service.generateCheckinPdf(PARTNER_ID, PROPERTY_ID, res as any);

      expect(mockDocInstance.pipe).toHaveBeenCalledWith(res);
      expect(mockDocInstance.end).toHaveBeenCalled();
    });
  });
});
