import { MembersController } from "./members.controller.js";
import type { MembersService } from "./members.service.js";
import type { PartnerMemberRow } from "../database/database.types.js";

function makeService(): jest.Mocked<
  Pick<
    MembersService,
    "findByProperty" | "findByPartnerEnriched" | "invite" | "remove"
  >
> {
  return {
    findByProperty: jest.fn(),
    findByPartnerEnriched: jest.fn(),
    invite: jest.fn(),
    remove: jest.fn(),
  };
}

const MEMBER_ROW = (): PartnerMemberRow => ({
  id: "member-uuid-1",
  partnerId: "partner-uuid-1",
  propertyId: "property-uuid-1",
  userId: "user-uuid-1",
  role: "manager",
  status: "active",
  createdAt: new Date("2026-01-01"),
});

const INVITE_DTO = {
  propertyId: "b1000000-0000-0000-0000-000000000001",
  firstName: "Carlos",
  lastName: "Lopez",
  email: "carlos@hotel.com",
  password: "managerpass123",
};

describe("MembersController", () => {
  let controller: MembersController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new MembersController(service as unknown as MembersService);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("calls findByProperty when propertyId is provided", async () => {
      service.findByProperty.mockResolvedValue([MEMBER_ROW()]);
      const result = await controller.findAll(
        "partner-uuid-1",
        "property-uuid-1",
      );
      expect(service.findByProperty).toHaveBeenCalledWith("property-uuid-1");
      expect(service.findByPartnerEnriched).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("calls findByPartnerEnriched when no propertyId is provided", async () => {
      service.findByPartnerEnriched.mockResolvedValue([]);
      const result = await controller.findAll("partner-uuid-1", undefined);
      expect(service.findByPartnerEnriched).toHaveBeenCalledWith(
        "partner-uuid-1",
      );
      expect(service.findByProperty).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("prioritizes propertyId over partnerId when both are provided", async () => {
      service.findByProperty.mockResolvedValue([]);
      await controller.findAll("partner-uuid-1", "property-uuid-1");
      expect(service.findByProperty).toHaveBeenCalledWith("property-uuid-1");
      expect(service.findByPartnerEnriched).not.toHaveBeenCalled();
    });
  });

  // ─── invite ──────────────────────────────────────────────────────────────────

  describe("invite", () => {
    it("delegates to membersService.invite with partnerId from path", async () => {
      const payload = { manager: MEMBER_ROW(), challengeId: "chal-1" };
      service.invite.mockResolvedValue(payload);
      const result = await controller.invite("partner-uuid-1", INVITE_DTO);
      expect(service.invite).toHaveBeenCalledWith("partner-uuid-1", INVITE_DTO);
      expect(result).toBe(payload);
    });

    it("propagates errors from service", async () => {
      service.invite.mockRejectedValue(new Error("Conflict"));
      await expect(
        controller.invite("partner-uuid-1", INVITE_DTO),
      ).rejects.toThrow("Conflict");
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("delegates to membersService.remove with memberId from path", async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove("partner-uuid-1", "member-uuid-1");
      expect(service.remove).toHaveBeenCalledWith("member-uuid-1");
    });

    it("propagates errors from service", async () => {
      service.remove.mockRejectedValue(new Error("Not Found"));
      await expect(
        controller.remove("partner-uuid-1", "bad-id"),
      ).rejects.toThrow("Not Found");
    });
  });
});
