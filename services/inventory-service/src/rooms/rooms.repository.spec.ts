import { RoomsRepository } from "./rooms.repository";
import type { Kysely } from "kysely";
import type { Database } from "../database/database.types";

const NOW = new Date("2026-01-01T00:00:00Z");

const ROOM_ROW = {
  id: "room-1",
  property_id: "prop-1",
  room_type: "double",
  capacity: 2,
  total_rooms: 5,
  base_price_usd: "150.00",
  status: "active",
  created_at: NOW,
  updated_at: NOW,
};

function makeChain(
  resolved: {
    execute?: any;
    executeTakeFirst?: any;
    executeTakeFirstOrThrow?: any;
  } = {},
) {
  const chain: Record<string, any> = {};
  for (const m of [
    "selectFrom",
    "insertInto",
    "updateTable",
    "selectAll",
    "where",
    "values",
    "returningAll",
    "set",
    "orderBy",
  ]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain["execute"] = jest.fn().mockResolvedValue(resolved.execute ?? []);
  chain["executeTakeFirst"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirst ?? undefined);
  chain["executeTakeFirstOrThrow"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirstOrThrow ?? undefined);
  return chain as unknown as Kysely<Database>;
}

function makeRepo(db: Kysely<Database>) {
  return new RoomsRepository(db as any);
}

describe("RoomsRepository", () => {
  describe("create", () => {
    it("inserts and returns the new room", async () => {
      const db = makeChain({ executeTakeFirstOrThrow: ROOM_ROW });
      const repo = makeRepo(db);
      const result = await repo.create({
        property_id: "prop-1",
        room_type: "double",
        capacity: 2,
        total_rooms: 5,
        base_price_usd: "150.00",
      });
      expect(result.id).toBe("room-1");
      expect((db as any).insertInto).toHaveBeenCalledWith("inv_rooms");
    });
  });

  describe("findByProperty", () => {
    it("returns rooms for a property", async () => {
      const db = makeChain({ execute: [ROOM_ROW] });
      const repo = makeRepo(db);
      const result = await repo.findByProperty("prop-1");
      expect(result).toHaveLength(1);
      expect((db as any).where).toHaveBeenCalledWith(
        "property_id",
        "=",
        "prop-1",
      );
      expect((db as any).where).toHaveBeenCalledWith("status", "=", "active");
    });
  });

  describe("findById", () => {
    it("returns the room when found", async () => {
      const db = makeChain({ executeTakeFirst: ROOM_ROW });
      const repo = makeRepo(db);
      const result = await repo.findById("room-1");
      expect(result?.id).toBe("room-1");
    });

    it("returns undefined when not found", async () => {
      const db = makeChain({ executeTakeFirst: undefined });
      const repo = makeRepo(db);
      const result = await repo.findById("missing");
      expect(result).toBeUndefined();
    });
  });

  describe("findByPropertyAndType", () => {
    it("queries by property_id, room_type, and active status", async () => {
      const db = makeChain({ executeTakeFirst: ROOM_ROW });
      const repo = makeRepo(db);
      const result = await repo.findByPropertyAndType("prop-1", "double");
      expect(result?.room_type).toBe("double");
      expect((db as any).where).toHaveBeenCalledWith(
        "room_type",
        "=",
        "double",
      );
    });
  });

  describe("update", () => {
    it("updates the room and returns the updated row", async () => {
      const db = makeChain({ executeTakeFirst: { ...ROOM_ROW, capacity: 3 } });
      const repo = makeRepo(db);
      const result = await repo.update("room-1", { capacity: 3 });
      expect(result?.capacity).toBe(3);
      expect((db as any).updateTable).toHaveBeenCalledWith("inv_rooms");
    });
  });

  describe("softDelete", () => {
    it("sets status to inactive", async () => {
      const db = makeChain({ execute: [] });
      const repo = makeRepo(db);
      await repo.softDelete("room-1");
      expect((db as any).set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "inactive" }),
      );
    });
  });
});
