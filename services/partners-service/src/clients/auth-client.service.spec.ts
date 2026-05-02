import {
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AuthClientService } from "./auth-client.service.js";

function mockFetch(ok: boolean, body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  });
}

const OWNER_PAYLOAD = {
  email: "jane@acme.com",
  password: "secret123",
  firstName: "Jane",
  lastName: "Doe",
  partnerId: "partner-uuid-1",
};

const MANAGER_PAYLOAD = {
  ...OWNER_PAYLOAD,
  propertyId: "property-uuid-1",
};

describe("AuthClientService", () => {
  let svc: AuthClientService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    svc = new AuthClientService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ─── createOwnerUser ──────────────────────────────────────────────────────────

  describe("createOwnerUser", () => {
    it("returns challengeId and userId on success", async () => {
      global.fetch = mockFetch(true, {
        challengeId: "chal-1",
        userId: "user-1",
      }) as typeof fetch;
      const result = await svc.createOwnerUser(OWNER_PAYLOAD);
      expect(result).toEqual({ challengeId: "chal-1", userId: "user-1" });
    });

    it("sends role=partner in request body", async () => {
      global.fetch = mockFetch(true, {
        challengeId: "c1",
        userId: "u1",
      }) as typeof fetch;
      await svc.createOwnerUser(OWNER_PAYLOAD);
      const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(options.body as string) as { role: string };
      expect(body.role).toBe("partner");
    });

    it("throws ConflictException on 409", async () => {
      global.fetch = mockFetch(false, "Conflict", 409) as typeof fetch;
      await expect(svc.createOwnerUser(OWNER_PAYLOAD)).rejects.toThrow(
        ConflictException,
      );
    });

    it("throws InternalServerErrorException on other non-ok status", async () => {
      global.fetch = mockFetch(false, "Server Error", 500) as typeof fetch;
      await expect(svc.createOwnerUser(OWNER_PAYLOAD)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it("includes status code in error message", async () => {
      global.fetch = mockFetch(false, "Boom", 503) as typeof fetch;
      await expect(svc.createOwnerUser(OWNER_PAYLOAD)).rejects.toThrow("503");
    });
  });

  // ─── createManagerUser ────────────────────────────────────────────────────────

  describe("createManagerUser", () => {
    it("returns challengeId and userId on success", async () => {
      global.fetch = mockFetch(true, {
        challengeId: "chal-2",
        userId: "user-2",
      }) as typeof fetch;
      const result = await svc.createManagerUser(MANAGER_PAYLOAD);
      expect(result).toEqual({ challengeId: "chal-2", userId: "user-2" });
    });

    it("sends role=manager in request body", async () => {
      global.fetch = mockFetch(true, {
        challengeId: "c2",
        userId: "u2",
      }) as typeof fetch;
      await svc.createManagerUser(MANAGER_PAYLOAD);
      const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(options.body as string) as { role: string };
      expect(body.role).toBe("manager");
    });

    it("throws ConflictException on 409", async () => {
      global.fetch = mockFetch(false, "Conflict", 409) as typeof fetch;
      await expect(svc.createManagerUser(MANAGER_PAYLOAD)).rejects.toThrow(
        ConflictException,
      );
    });

    it("throws InternalServerErrorException on other non-ok status", async () => {
      global.fetch = mockFetch(false, "Error", 422) as typeof fetch;
      await expect(svc.createManagerUser(MANAGER_PAYLOAD)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── listUsersByIds ───────────────────────────────────────────────────────────

  describe("listUsersByIds", () => {
    it("returns empty array without fetching when ids is empty", async () => {
      global.fetch = jest.fn() as typeof fetch;
      const result = await svc.listUsersByIds([]);
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns user array on success", async () => {
      const users = [
        {
          id: "user-1",
          email: "a@b.com",
          role: "partner",
          createdAt: "2026-01-01",
          lastLoginAt: null,
        },
      ];
      global.fetch = mockFetch(true, users) as typeof fetch;
      const result = await svc.listUsersByIds(["user-1"]);
      expect(result).toEqual(users);
    });

    it("encodes ids as comma-separated query string", async () => {
      global.fetch = mockFetch(true, []) as typeof fetch;
      await svc.listUsersByIds(["id-1", "id-2"]);
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("ids=id-1,id-2");
    });

    it("throws InternalServerErrorException on non-ok response", async () => {
      global.fetch = mockFetch(false, "Error", 500) as typeof fetch;
      await expect(svc.listUsersByIds(["user-1"])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
