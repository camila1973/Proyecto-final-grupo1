import { Test, TestingModule } from "@nestjs/testing";
import { DeviceTokensService } from "./device-tokens.service";
import { KYSELY } from "../database/database.provider";

const mockDb = {
  insertInto: jest.fn(),
  selectFrom: jest.fn(),
  deleteFrom: jest.fn(),
};

describe("DeviceTokensService", () => {
  let service: DeviceTokensService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceTokensService, { provide: KYSELY, useValue: mockDb }],
    }).compile();
    service = module.get<DeviceTokensService>(DeviceTokensService);
  });

  describe("upsert", () => {
    it("inserts a new device token with on-conflict update", async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      const onConflict = jest.fn().mockReturnValue({ execute });
      const values = jest.fn().mockReturnValue({ onConflict });
      mockDb.insertInto.mockReturnValue({ values });

      await service.upsert("user-1", "token-abc", "ios");
      expect(mockDb.insertInto).toHaveBeenCalledWith("device_tokens");
      expect(values).toHaveBeenCalledWith({
        user_id: "user-1",
        token: "token-abc",
        platform: "ios",
      });
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("findByUserId", () => {
    it("returns token string when row exists", async () => {
      const executeTakeFirst = jest
        .fn()
        .mockResolvedValue({ token: "token-xyz" });
      const limit = jest.fn().mockReturnValue({ executeTakeFirst });
      const orderBy = jest.fn().mockReturnValue({ limit });
      const where = jest.fn().mockReturnValue({ orderBy });
      const select = jest.fn().mockReturnValue({ where });
      mockDb.selectFrom.mockReturnValue({ select });

      const result = await service.findByUserId("user-1");
      expect(result).toBe("token-xyz");
    });

    it("returns null when no row found", async () => {
      const executeTakeFirst = jest.fn().mockResolvedValue(undefined);
      const limit = jest.fn().mockReturnValue({ executeTakeFirst });
      const orderBy = jest.fn().mockReturnValue({ limit });
      const where = jest.fn().mockReturnValue({ orderBy });
      const select = jest.fn().mockReturnValue({ where });
      mockDb.selectFrom.mockReturnValue({ select });

      const result = await service.findByUserId("user-missing");
      expect(result).toBeNull();
    });
  });

  describe("remove", () => {
    it("deletes the device token for the given userId and token", async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      const where2 = jest.fn().mockReturnValue({ execute });
      const where1 = jest.fn().mockReturnValue({ where: where2 });
      mockDb.deleteFrom.mockReturnValue({ where: where1 });

      await service.remove("user-1", "token-abc");
      expect(mockDb.deleteFrom).toHaveBeenCalledWith("device_tokens");
      expect(where1).toHaveBeenCalledWith("user_id", "=", "user-1");
      expect(where2).toHaveBeenCalledWith("token", "=", "token-abc");
    });
  });
});
