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
  partnerId: "a1000000-0000-0000-0000-000000000001",
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
      const result = await controller.findAll(undefined, "property-uuid-1");
      expect(service.findByProperty).toHaveBeenCalledWith("property-uuid-1");
      expect(service.findByPartnerEnriched).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("calls findByPartnerEnriched when only partnerId is provided", async () => {
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

    it("returns empty array when neither param is provided", async () => {
      const result = await controller.findAll(undefined, undefined);
      expect(result).toEqual([]);
      expect(service.findByProperty).not.toHaveBeenCalled();
      expect(service.findByPartnerEnriched).not.toHaveBeenCalled();
    });
  });

  // ─── invite ──────────────────────────────────────────────────────────────────

  describe("invite", () => {
    it("delegates to membersService.invite and returns result", async () => {
      const payload = { manager: MEMBER_ROW(), challengeId: "chal-1" };
      service.invite.mockResolvedValue(payload);
      const result = await controller.invite(INVITE_DTO);
      expect(service.invite).toHaveBeenCalledWith(INVITE_DTO);
      expect(result).toBe(payload);
    });

    it("propagates errors from service", async () => {
      service.invite.mockRejectedValue(new Error("Conflict"));
      await expect(controller.invite(INVITE_DTO)).rejects.toThrow("Conflict");
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("delegates to membersService.remove", async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove("member-uuid-1");
      expect(service.remove).toHaveBeenCalledWith("member-uuid-1");
    });

    it("propagates errors from service", async () => {
      service.remove.mockRejectedValue(new Error("Not Found"));
      await expect(controller.remove("bad-id")).rejects.toThrow("Not Found");
    });
  });
});
