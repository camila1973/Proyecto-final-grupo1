import { DeviceTokensController } from "./device-tokens.controller";

const mockSvc = {
  upsert: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
};

describe("DeviceTokensController", () => {
  let controller: DeviceTokensController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DeviceTokensController(mockSvc as any);
  });

  describe("register (POST /notifications/device-tokens)", () => {
    it("calls svc.upsert with userId, token, and platform", async () => {
      await controller.register({
        userId: "user-1",
        token: "fcm-token-abc",
        platform: "ios",
      });

      expect(mockSvc.upsert).toHaveBeenCalledWith(
        "user-1",
        "fcm-token-abc",
        "ios",
      );
    });

    it("calls svc.upsert with android platform", async () => {
      await controller.register({
        userId: "user-2",
        token: "fcm-token-xyz",
        platform: "android",
      });

      expect(mockSvc.upsert).toHaveBeenCalledWith(
        "user-2",
        "fcm-token-xyz",
        "android",
      );
    });

    it("resolves without returning a body (204 No Content)", async () => {
      const result = await controller.register({
        userId: "user-3",
        token: "fcm-token-def",
        platform: "ios",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("unregister (DELETE /notifications/device-tokens)", () => {
    it("calls svc.remove with userId and token", async () => {
      await controller.unregister({ userId: "user-1", token: "fcm-token-abc" });

      expect(mockSvc.remove).toHaveBeenCalledWith("user-1", "fcm-token-abc");
    });

    it("resolves without returning a body (204 No Content)", async () => {
      const result = await controller.unregister({
        userId: "user-1",
        token: "fcm-token-abc",
      });

      expect(result).toBeUndefined();
    });
  });
});
