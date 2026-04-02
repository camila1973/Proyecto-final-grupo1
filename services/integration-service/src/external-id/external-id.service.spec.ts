import { Test, TestingModule } from "@nestjs/testing";
import { ExternalIdService } from "./external-id.service";
import { KYSELY } from "../database/database.provider";

describe("ExternalIdService", () => {
  const buildService = async (
    executeTakeFirst: jest.Mock,
    execute: jest.Mock = jest.fn().mockResolvedValue([]),
  ) => {
    // onConflict takes a callback (oc) => oc.columns([...]).doNothing()
    // but .execute() is called on the result of .onConflict(), not on the callback result
    const oc = {
      columns: jest
        .fn()
        .mockReturnValue({ doNothing: jest.fn().mockReturnThis() }),
    };
    const db = {
      selectFrom: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst,
      }),
      insertInto: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflict: jest.fn((cb) => {
            cb(oc);
            return { execute };
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalIdService, { provide: KYSELY, useValue: db }],
    }).compile();

    return { service: module.get<ExternalIdService>(ExternalIdService), db };
  };

  describe("resolve", () => {
    it("returns internalId when mapping found", async () => {
      const executeTakeFirst = jest
        .fn()
        .mockResolvedValue({ internalId: "internal-123" });
      const { service } = await buildService(executeTakeFirst);
      const result = await service.resolve("partner-1", "property", "ext-1");
      expect(result).toBe("internal-123");
    });

    it("returns null when mapping not found", async () => {
      const executeTakeFirst = jest.fn().mockResolvedValue(undefined);
      const { service } = await buildService(executeTakeFirst);
      const result = await service.resolve("partner-1", "property", "ext-1");
      expect(result).toBeNull();
    });
  });

  describe("register", () => {
    it("inserts a new mapping without throwing", async () => {
      const execute = jest.fn().mockResolvedValue([]);
      const { service } = await buildService(jest.fn(), execute);
      await expect(
        service.register("partner-1", "property", "ext-1", "internal-1"),
      ).resolves.toBeUndefined();
      expect(execute).toHaveBeenCalled();
    });

    it("does not throw on duplicate (onConflict doNothing)", async () => {
      const execute = jest.fn().mockResolvedValue([]);
      const { service } = await buildService(jest.fn(), execute);
      await service.register("p", "room", "ext", "int");
      await service.register("p", "room", "ext", "int");
      expect(execute).toHaveBeenCalledTimes(2);
    });
  });
});
