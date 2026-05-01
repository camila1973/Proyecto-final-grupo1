import {
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PartnersService } from "./partners.service.js";
import type { PartnersRepository } from "./partners.repository.js";
import type { AuthClientService } from "../clients/auth-client.service.js";
import type { PartnerRow } from "../database/database.types.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<
  Pick<
    PartnersRepository,
    "findAll" | "findById" | "findBySlug" | "insert" | "update" | "delete"
  >
> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makeAuthClient(): jest.Mocked<
  Pick<AuthClientService, "createOwnerUser">
> {
  return { createOwnerUser: jest.fn() };
}

const PARTNER_ROW = (overrides: Partial<PartnerRow> = {}): PartnerRow => ({
  id: "partner-uuid-1",
  name: "Acme Hotels",
  slug: "acme-hotels",
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

const REGISTER_DTO = {
  orgName: "Acme Hotels",
  slug: "acme-hotels",
  firstName: "Jane",
  lastName: "Doe",
  ownerEmail: "jane@acme.com",
  ownerPassword: "supersecret123",
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PartnersService", () => {
  let service: PartnersService;
  let repo: ReturnType<typeof makeRepo>;
  let authClient: ReturnType<typeof makeAuthClient>;

  beforeEach(() => {
    repo = makeRepo();
    authClient = makeAuthClient();
    repo.findBySlug.mockResolvedValue(null);
    repo.insert.mockResolvedValue(PARTNER_ROW());
    repo.delete.mockResolvedValue(undefined);
    authClient.createOwnerUser.mockResolvedValue({
      challengeId: "chal-uuid-1",
    });
    service = new PartnersService(
      repo as unknown as PartnersRepository,
      authClient as unknown as AuthClientService,
    );
  });

  // ─── findAll / findOne ───────────────────────────────────────────────────────

  describe("findAll", () => {
    it("delegates to repo", async () => {
      repo.findAll.mockResolvedValue([PARTNER_ROW()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findOne", () => {
    it("delegates to repo.findById", async () => {
      repo.findById.mockResolvedValue(PARTNER_ROW());
      const result = await service.findOne("partner-uuid-1");
      expect(result.id).toBe("partner-uuid-1");
      expect(repo.findById).toHaveBeenCalledWith("partner-uuid-1");
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("inserts and returns the new partner", async () => {
      const result = await service.create({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
      expect(result.slug).toBe("acme-hotels");
      expect(repo.insert).toHaveBeenCalledWith({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
    });

    it("throws ConflictException when slug is taken", async () => {
      repo.findBySlug.mockResolvedValue(PARTNER_ROW());
      await expect(
        service.create({ name: "Acme Hotels", slug: "acme-hotels" }),
      ).rejects.toThrow(ConflictException);
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("delegates to repo.update", async () => {
      repo.update.mockResolvedValue(PARTNER_ROW({ name: "New Name" }));
      const result = await service.update("partner-uuid-1", {
        name: "New Name",
      });
      expect(result.name).toBe("New Name");
      expect(repo.update).toHaveBeenCalledWith("partner-uuid-1", {
        name: "New Name",
      });
    });
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("returns partner and challengeId on success", async () => {
      const result = await service.register(REGISTER_DTO);

      expect(result.partner.id).toBe("partner-uuid-1");
      expect(result.challengeId).toBe("chal-uuid-1");
    });

    it("creates partner then calls authClient with correct payload", async () => {
      await service.register(REGISTER_DTO);

      expect(repo.insert).toHaveBeenCalledWith({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
      expect(authClient.createOwnerUser).toHaveBeenCalledWith({
        email: "jane@acme.com",
        password: "supersecret123",
        firstName: "Jane",
        lastName: "Doe",
        partnerId: "partner-uuid-1",
      });
    });

    it("throws ConflictException when slug is already taken", async () => {
      repo.findBySlug.mockResolvedValue(PARTNER_ROW());

      await expect(service.register(REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.insert).not.toHaveBeenCalled();
      expect(authClient.createOwnerUser).not.toHaveBeenCalled();
    });

    it("deletes the partner and rethrows when authClient fails", async () => {
      const authError = new InternalServerErrorException("auth-service down");
      authClient.createOwnerUser.mockRejectedValue(authError);

      await expect(service.register(REGISTER_DTO)).rejects.toThrow(authError);
      expect(repo.delete).toHaveBeenCalledWith("partner-uuid-1");
    });

    it("rethrows ConflictException from authClient (duplicate email)", async () => {
      authClient.createOwnerUser.mockRejectedValue(
        new ConflictException("Email is already registered"),
      );

      await expect(service.register(REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.delete).toHaveBeenCalledWith("partner-uuid-1");
    });

    it("still rethrows even when compensation delete also fails", async () => {
      authClient.createOwnerUser.mockRejectedValue(new Error("auth down"));
      repo.delete.mockRejectedValue(new Error("db down"));

      await expect(service.register(REGISTER_DTO)).rejects.toThrow("auth down");
    });
  });
});
