import { NotFoundException } from "@nestjs/common";
import { RoomLocationCacheRepository } from "./room-location-cache.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(singleResult: Record<string, unknown> | undefined = undefined) {
  const db: Record<string, jest.Mock> = {};
  const chain = [
    "insertInto",
    "selectFrom",
    "where",
    "select",
    "onConflict",
    "column",
    "doUpdateSet",
    "values",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue([]);
  db.executeTakeFirst = jest.fn().mockResolvedValue(singleResult);
  return db as any;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("RoomLocationCacheRepository", () => {
  describe("findByRoomId", () => {
    it("returns country and city when the room is cached", async () => {
      const db = makeDb({ country: "MX", city: "cancún" });
      const repo = new RoomLocationCacheRepository(db);

      const result = await repo.findByRoomId("room-1");

      expect(db.where).toHaveBeenCalledWith("room_id", "=", "room-1");
      expect(result).toEqual({ country: "MX", city: "cancún" });
    });

    it("throws NotFoundException when the room is not in the cache", async () => {
      const db = makeDb(undefined);
      const repo = new RoomLocationCacheRepository(db);

      await expect(repo.findByRoomId("unknown-room")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("upsert", () => {
    it("calls insertInto with lowercased city", async () => {
      const db = makeDb();
      const repo = new RoomLocationCacheRepository(db);

      await repo.upsert("room-1", "prop-1", { country: "MX", city: "Cancún" });

      expect(db.insertInto).toHaveBeenCalledWith("room_location_cache");
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({ city: "cancún" }),
      );
    });

    it("stores the country as-is", async () => {
      const db = makeDb();
      const repo = new RoomLocationCacheRepository(db);

      await repo.upsert("room-1", "prop-1", { country: "CO", city: "bogotá" });

      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "CO",
          room_id: "room-1",
          property_id: "prop-1",
        }),
      );
    });
  });
});
