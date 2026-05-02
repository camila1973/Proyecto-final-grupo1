import { ConflictException, NotFoundException } from "@nestjs/common";
import { MembersService } from "./members.service.js";
import type { MembersRepository } from "./members.repository.js";
import type { AuthClientService } from "../clients/auth-client.service.js";
import type { PartnerMemberRow } from "../database/database.types.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<
  Pick<
    MembersRepository,
    | "findByPartnerId"
    | "findByPropertyId"
    | "findByUserId"
    | "insert"
    | "delete"
  >
> {
  return {
    findByPartnerId: jest.fn(),
    findByPropertyId: jest.fn(),
    findByUserId: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  };
}

function makeAuthClient(): jest.Mocked<
  Pick<AuthClientService, "createManagerUser" | "listUsersByIds">
> {
  return { createManagerUser: jest.fn(), listUsersByIds: jest.fn() };
}

const MEMBER_ROW = (
  overrides: Partial<PartnerMemberRow> = {},
): PartnerMemberRow => ({
  id: "member-uuid-1",
  partnerId: "partner-uuid-1",
  propertyId: "property-uuid-1",
  userId: "user-uuid-1",
  role: "manager",
  status: "active",
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

const PARTNER_ID = "a1000000-0000-0000-0000-000000000001";
const INVITE_DTO = {
  propertyId: "b1000000-0000-0000-0000-000000000001",
  firstName: "Carlos",
  lastName: "Lopez",
  email: "carlos@hotel.com",
  password: "managerpass123",
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe("MembersService", () => {
  let service: MembersService;
  let repo: ReturnType<typeof makeRepo>;
  let authClient: ReturnType<typeof makeAuthClient>;

  beforeEach(() => {
    repo = makeRepo();
    authClient = makeAuthClient();
    repo.findByPropertyId.mockResolvedValue([]);
    repo.insert.mockResolvedValue(MEMBER_ROW());
    authClient.createManagerUser.mockResolvedValue({
      challengeId: "chal-uuid-1",
      userId: "user-uuid-1",
    });
    service = new MembersService(
      repo as unknown as MembersRepository,
      authClient as unknown as AuthClientService,
    );
  });

  // ─── findByPartner ───────────────────────────────────────────────────────────

  describe("findByPartner", () => {
    it("delegates to repo", async () => {
      repo.findByPartnerId.mockResolvedValue([MEMBER_ROW()]);
      const result = await service.findByPartner("partner-uuid-1");
      expect(result).toHaveLength(1);
      expect(repo.findByPartnerId).toHaveBeenCalledWith("partner-uuid-1");
    });
  });

  // ─── findByProperty ──────────────────────────────────────────────────────────

  describe("findByProperty", () => {
    it("delegates to repo", async () => {
      repo.findByPropertyId.mockResolvedValue([MEMBER_ROW()]);
      const result = await service.findByProperty("property-uuid-1");
      expect(result).toHaveLength(1);
      expect(repo.findByPropertyId).toHaveBeenCalledWith("property-uuid-1");
    });
  });

  // ─── findByPartnerEnriched ───────────────────────────────────────────────────

  describe("findByPartnerEnriched", () => {
    it("returns empty array when partner has no members", async () => {
      repo.findByPartnerId.mockResolvedValue([]);
      const result = await service.findByPartnerEnriched("partner-uuid-1");
      expect(result).toEqual([]);
      expect(authClient.listUsersByIds).not.toHaveBeenCalled();
    });

    it("enriches members with user data from auth service", async () => {
      const row = MEMBER_ROW();
      repo.findByPartnerId.mockResolvedValue([row]);
      authClient.listUsersByIds.mockResolvedValue([
        {
          id: "user-uuid-1",
          email: "carlos@hotel.com",
          role: "manager",
          firstName: "Carlos",
          lastName: "Lopez",
          createdAt: "2026-01-01",
          lastLoginAt: "2026-04-01T10:00:00Z",
        },
      ]);
      const result = await service.findByPartnerEnriched("partner-uuid-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: row.id,
        userId: row.userId,
        email: "carlos@hotel.com",
        firstName: "Carlos",
        lastName: "Lopez",
        role: row.role,
        propertyId: row.propertyId,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        lastLoginAt: "2026-04-01T10:00:00Z",
      });
    });

    it("uses empty string for email and null for names when user not found in auth service", async () => {
      repo.findByPartnerId.mockResolvedValue([MEMBER_ROW()]);
      authClient.listUsersByIds.mockResolvedValue([]);
      const result = await service.findByPartnerEnriched("partner-uuid-1");
      expect(result[0].email).toBe("");
      expect(result[0].firstName).toBeNull();
      expect(result[0].lastName).toBeNull();
      expect(result[0].lastLoginAt).toBeNull();
    });

    it("passes all member userIds to auth service", async () => {
      const rows = [
        MEMBER_ROW({ id: "m1", userId: "u1" }),
        MEMBER_ROW({ id: "m2", userId: "u2" }),
      ];
      repo.findByPartnerId.mockResolvedValue(rows);
      authClient.listUsersByIds.mockResolvedValue([]);
      await service.findByPartnerEnriched("partner-uuid-1");
      expect(authClient.listUsersByIds).toHaveBeenCalledWith(["u1", "u2"]);
    });

    it("serializes createdAt as ISO string", async () => {
      const date = new Date("2026-03-15T08:30:00Z");
      repo.findByPartnerId.mockResolvedValue([MEMBER_ROW({ createdAt: date })]);
      authClient.listUsersByIds.mockResolvedValue([]);
      const result = await service.findByPartnerEnriched("partner-uuid-1");
      expect(result[0].createdAt).toBe(date.toISOString());
    });
  });

  // ─── invite ──────────────────────────────────────────────────────────────────

  describe("invite", () => {
    it("calls auth and inserts member with returned userId", async () => {
      const result = await service.invite(PARTNER_ID, INVITE_DTO);

      expect(authClient.createManagerUser).toHaveBeenCalledWith({
        email: INVITE_DTO.email,
        password: INVITE_DTO.password,
        firstName: INVITE_DTO.firstName,
        lastName: INVITE_DTO.lastName,
        partnerId: PARTNER_ID,
        propertyId: INVITE_DTO.propertyId,
      });
      expect(repo.insert).toHaveBeenCalledWith({
        partnerId: PARTNER_ID,
        propertyId: INVITE_DTO.propertyId,
        userId: "user-uuid-1",
        role: "manager",
      });
      expect(result.challengeId).toBe("chal-uuid-1");
      expect(result.manager.id).toBe("member-uuid-1");
    });

    it("throws ConflictException when property already has a manager", async () => {
      repo.findByPropertyId.mockResolvedValue([MEMBER_ROW()]);
      await expect(service.invite(PARTNER_ID, INVITE_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(authClient.createManagerUser).not.toHaveBeenCalled();
    });

    it("propagates auth error and does not insert member row", async () => {
      authClient.createManagerUser.mockRejectedValue(
        new ConflictException("Email is already registered"),
      );
      await expect(service.invite(PARTNER_ID, INVITE_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("delegates to repo.delete", async () => {
      repo.delete.mockResolvedValue(undefined);
      await service.remove("member-uuid-1");
      expect(repo.delete).toHaveBeenCalledWith("member-uuid-1");
    });

    it("propagates NotFoundException when member not found", async () => {
      repo.delete.mockRejectedValue(new NotFoundException("Member not found"));
      await expect(service.remove("bad-id")).rejects.toThrow(NotFoundException);
    });
  });
});
