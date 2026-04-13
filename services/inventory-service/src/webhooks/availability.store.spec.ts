import { AvailabilityStore } from "./availability.store";
import type { AvailabilityRecord } from "./availability.store";

function makeRecord(
  overrides: Partial<AvailabilityRecord> = {},
): AvailabilityRecord {
  return {
    skuId: "prop-1:room-1:2026-04-01",
    propertyId: "prop-1",
    roomId: "room-1",
    date: "2026-04-01",
    available: true,
    allotment: 5,
    price: 100,
    currency: "USD",
    stopSell: false,
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    source: "hotelbeds",
    ...overrides,
  };
}

describe("AvailabilityStore", () => {
  describe("upsert", () => {
    it("stores a record by skuId", () => {
      const store = new AvailabilityStore();
      const record = makeRecord();
      store.upsert(record);
      expect(store.get(record.skuId)).toEqual(record);
    });

    it("overwrites an existing record with the same skuId", () => {
      const store = new AvailabilityStore();
      store.upsert(makeRecord({ available: true }));
      store.upsert(makeRecord({ available: false }));
      expect(store.get("prop-1:room-1:2026-04-01")?.available).toBe(false);
    });
  });

  describe("upsertBatch", () => {
    it("stores multiple records at once", () => {
      const store = new AvailabilityStore();
      const records = [
        makeRecord({ skuId: "prop-1:room-1:2026-04-01", date: "2026-04-01" }),
        makeRecord({ skuId: "prop-1:room-1:2026-04-02", date: "2026-04-02" }),
      ];
      store.upsertBatch(records);
      expect(store.size()).toBe(2);
    });

    it("handles an empty array without error", () => {
      const store = new AvailabilityStore();
      store.upsertBatch([]);
      expect(store.size()).toBe(0);
    });

    it("overwrites existing records with matching skuIds", () => {
      const store = new AvailabilityStore();
      store.upsert(makeRecord({ price: 100 }));
      store.upsertBatch([makeRecord({ price: 200 })]);
      expect(store.get("prop-1:room-1:2026-04-01")?.price).toBe(200);
    });
  });

  describe("get", () => {
    it("returns undefined for a missing skuId", () => {
      const store = new AvailabilityStore();
      expect(store.get("nonexistent")).toBeUndefined();
    });

    it("returns the exact record object after upsert", () => {
      const store = new AvailabilityStore();
      const record = makeRecord();
      store.upsert(record);
      expect(store.get(record.skuId)).toBe(record);
    });
  });

  describe("getByProperty", () => {
    it("returns all records for the given propertyId", () => {
      const store = new AvailabilityStore();
      store.upsert(
        makeRecord({ skuId: "prop-1:room-1:2026-04-01", propertyId: "prop-1" }),
      );
      store.upsert(
        makeRecord({
          skuId: "prop-1:room-1:2026-04-02",
          propertyId: "prop-1",
          date: "2026-04-02",
        }),
      );
      store.upsert(
        makeRecord({
          skuId: "prop-2:room-2:2026-04-01",
          propertyId: "prop-2",
          roomId: "room-2",
        }),
      );
      const result = store.getByProperty("prop-1");
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.propertyId === "prop-1")).toBe(true);
    });

    it("returns empty array when no records match the propertyId", () => {
      const store = new AvailabilityStore();
      store.upsert(makeRecord({ propertyId: "prop-1" }));
      expect(store.getByProperty("prop-99")).toEqual([]);
    });

    it("returns empty array when store is empty", () => {
      const store = new AvailabilityStore();
      expect(store.getByProperty("prop-1")).toEqual([]);
    });
  });

  describe("size", () => {
    it("returns 0 for an empty store", () => {
      const store = new AvailabilityStore();
      expect(store.size()).toBe(0);
    });

    it("reflects the number of distinct skuIds stored", () => {
      const store = new AvailabilityStore();
      store.upsert(makeRecord({ skuId: "a" }));
      store.upsert(makeRecord({ skuId: "b" }));
      expect(store.size()).toBe(2);
    });

    it("does not grow when the same skuId is upserted twice", () => {
      const store = new AvailabilityStore();
      store.upsert(makeRecord({ skuId: "a", price: 100 }));
      store.upsert(makeRecord({ skuId: "a", price: 200 }));
      expect(store.size()).toBe(1);
    });
  });
});
