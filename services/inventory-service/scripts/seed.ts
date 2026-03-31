import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "../src/database/database.types.js";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5434/travelhub",
    }),
  }),
});

// ─── UUIDs — must match search-service/scripts/seed.ts ───────────────────────

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eachDay(fromDate: string, toDate: string): string[] {
  const days: string[] = [];
  const current = new Date(fromDate);
  const end = new Date(toDate);
  while (current < end) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Truncating tables...");
  await sql`TRUNCATE inv_availability, inv_room_rates, inv_rooms, inv_properties RESTART IDENTITY CASCADE`.execute(
    db,
  );

  // ── Properties ───────────────────────────────────────────────────────────
  console.log("Seeding inv_properties...");
  await db
    .insertInto("inv_properties")
    .values([
      {
        id: PROP_CANCUN_1,
        name: "Gran Caribe Resort & Spa",
        type: "hotel",
        city: "Cancún",
        country_code: "MX",
        stars: 5,
        partner_id: PARTNER_1,
      },
      {
        id: PROP_CANCUN_2,
        name: "Playa Azul Hotel",
        type: "hotel",
        city: "Cancún",
        country_code: "MX",
        stars: 4,
        partner_id: PARTNER_1,
      },
      {
        id: PROP_CANCUN_3,
        name: "Hostal Sol Cancún",
        type: "hostel",
        city: "Cancún",
        country_code: "MX",
        stars: 3,
        partner_id: PARTNER_2,
      },
      {
        id: PROP_CDMX_1,
        name: "Hotel Histórico Centro",
        type: "hotel",
        city: "Ciudad de México",
        country_code: "MX",
        stars: 5,
        partner_id: PARTNER_2,
      },
      {
        id: PROP_CDMX_2,
        name: "Condesa Inn",
        type: "hotel",
        city: "Ciudad de México",
        country_code: "MX",
        stars: 4,
        partner_id: PARTNER_2,
      },
    ])
    .execute();

  // ── Rooms ─────────────────────────────────────────────────────────────────
  console.log("Seeding inv_rooms...");
  await db
    .insertInto("inv_rooms")
    .values([
      // ── Gran Caribe Resort & Spa ──────────────────────────────────────────
      {
        id: ROOM(1),
        property_id: PROP_CANCUN_1,
        room_type: "deluxe",
        capacity: 2,
        total_rooms: 3,
        base_price_usd: "320.00",
      },
      {
        id: ROOM(2),
        property_id: PROP_CANCUN_1,
        room_type: "suite",
        capacity: 4,
        total_rooms: 2,
        base_price_usd: "580.00",
      },
      // ── Playa Azul Hotel ──────────────────────────────────────────────────
      {
        id: ROOM(3),
        property_id: PROP_CANCUN_2,
        room_type: "standard",
        capacity: 2,
        total_rooms: 5,
        base_price_usd: "145.00",
      },
      {
        id: ROOM(4),
        property_id: PROP_CANCUN_2,
        room_type: "deluxe",
        capacity: 2,
        total_rooms: 3,
        base_price_usd: "195.00",
      },
      {
        id: ROOM(5),
        property_id: PROP_CANCUN_2,
        room_type: "junior_suite",
        capacity: 3,
        total_rooms: 2,
        base_price_usd: "265.00",
      },
      // ── Hostal Sol Cancún ─────────────────────────────────────────────────
      {
        id: ROOM(6),
        property_id: PROP_CANCUN_3,
        room_type: "standard",
        capacity: 2,
        total_rooms: 4,
        base_price_usd: "65.00",
      },
      {
        id: ROOM(7),
        property_id: PROP_CANCUN_3,
        room_type: "standard",
        capacity: 2,
        total_rooms: 4,
        base_price_usd: "55.00",
      },
      // ── Hotel Histórico Centro ────────────────────────────────────────────
      {
        id: ROOM(8),
        property_id: PROP_CDMX_1,
        room_type: "deluxe",
        capacity: 2,
        total_rooms: 3,
        base_price_usd: "280.00",
      },
      {
        id: ROOM(9),
        property_id: PROP_CDMX_1,
        room_type: "penthouse",
        capacity: 4,
        total_rooms: 1,
        base_price_usd: "650.00",
      },
      // ── Condesa Inn ───────────────────────────────────────────────────────
      {
        id: ROOM(10),
        property_id: PROP_CDMX_2,
        room_type: "standard",
        capacity: 2,
        total_rooms: 5,
        base_price_usd: "110.00",
      },
    ])
    .execute();

  // ── Room rates — aligned with search-service price_periods ───────────────
  console.log("Seeding inv_room_rates...");
  await db
    .insertInto("inv_room_rates")
    .values([
      // ROOM 1 – Gran Caribe Resort & Spa, deluxe
      {
        room_id: ROOM(1),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-06-30"),
        price_usd: "310.00",
      },
      {
        room_id: ROOM(1),
        from_date: new Date("2027-07-01"),
        to_date: new Date("2027-08-31"),
        price_usd: "370.00",
      },
      {
        room_id: ROOM(1),
        from_date: new Date("2027-09-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "330.00",
      },
      // ROOM 2 – Gran Caribe Resort & Spa, suite
      {
        room_id: ROOM(2),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-06-30"),
        price_usd: "560.00",
      },
      {
        room_id: ROOM(2),
        from_date: new Date("2027-07-01"),
        to_date: new Date("2027-08-31"),
        price_usd: "650.00",
      },
      {
        room_id: ROOM(2),
        from_date: new Date("2027-09-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "590.00",
      },
      // ROOM 3 – Playa Azul Hotel, standard
      {
        room_id: ROOM(3),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "135.00",
      },
      // ROOM 4 – Playa Azul Hotel, deluxe
      {
        room_id: ROOM(4),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-06-30"),
        price_usd: "185.00",
      },
      {
        room_id: ROOM(4),
        from_date: new Date("2027-07-01"),
        to_date: new Date("2027-08-31"),
        price_usd: "220.00",
      },
      {
        room_id: ROOM(4),
        from_date: new Date("2027-09-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "195.00",
      },
      // ROOM 5 – Playa Azul Hotel, junior_suite
      {
        room_id: ROOM(5),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "250.00",
      },
      // ROOM 6 – Hostal Sol Cancún, standard double
      {
        room_id: ROOM(6),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "60.00",
      },
      // ROOM 7 – Hostal Sol Cancún, standard twin
      {
        room_id: ROOM(7),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "50.00",
      },
      // ROOM 8 – Hotel Histórico Centro, deluxe
      {
        room_id: ROOM(8),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-06-30"),
        price_usd: "270.00",
      },
      {
        room_id: ROOM(8),
        from_date: new Date("2027-07-01"),
        to_date: new Date("2027-08-31"),
        price_usd: "320.00",
      },
      {
        room_id: ROOM(8),
        from_date: new Date("2027-09-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "285.00",
      },
      // ROOM 9 – Hotel Histórico Centro, penthouse
      {
        room_id: ROOM(9),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "620.00",
      },
      // ROOM 10 – Condesa Inn, standard
      {
        room_id: ROOM(10),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "105.00",
      },
    ])
    .execute();

  // ── Availability — fully books each room type so availability checks
  // correctly exclude them. reserved_rooms must equal total_rooms so that
  // total_rooms - reserved_rooms - held_rooms = 0 (unavailable).
  console.log("Seeding inv_availability...");
  const bookedRanges: Array<{
    room_id: string;
    from_date: string;
    to_date: string;
    total_rooms: number; // must match inv_rooms.total_rooms to fill capacity
  }> = [
    // ROOM 1 – Gran Caribe Resort & Spa, deluxe (total_rooms: 3)
    {
      room_id: ROOM(1),
      from_date: "2027-03-25",
      to_date: "2027-03-30",
      total_rooms: 3,
    },
    {
      room_id: ROOM(1),
      from_date: "2027-04-10",
      to_date: "2027-04-15",
      total_rooms: 3,
    },
    // ROOM 2 – Gran Caribe Resort & Spa, suite (total_rooms: 2)
    {
      room_id: ROOM(2),
      from_date: "2027-04-02",
      to_date: "2027-04-07",
      total_rooms: 2,
    },
    // ROOM 4 – Playa Azul Hotel, deluxe (total_rooms: 3)
    {
      room_id: ROOM(4),
      from_date: "2027-03-30",
      to_date: "2027-04-05",
      total_rooms: 3,
    },
    // ROOM 5 – Playa Azul Hotel, junior suite (total_rooms: 2)
    {
      room_id: ROOM(5),
      from_date: "2027-05-01",
      to_date: "2027-05-08",
      total_rooms: 2,
    },
    // ROOM 8 – Hotel Histórico Centro, deluxe (total_rooms: 3)
    {
      room_id: ROOM(8),
      from_date: "2027-03-27",
      to_date: "2027-03-29",
      total_rooms: 3,
    },
    {
      room_id: ROOM(8),
      from_date: "2027-07-15",
      to_date: "2027-07-22",
      total_rooms: 3,
    },
    // ROOM 9 – Hotel Histórico Centro, penthouse (total_rooms: 1)
    {
      room_id: ROOM(9),
      from_date: "2027-04-01",
      to_date: "2027-04-20",
      total_rooms: 1,
    },
  ];

  for (const range of bookedRanges) {
    for (const date of eachDay(range.from_date, range.to_date)) {
      await db
        .insertInto("inv_availability")
        .values({
          room_id: range.room_id,
          date: new Date(date),
          reserved_rooms: range.total_rooms,
        })
        .onConflict((oc) =>
          oc.columns(["room_id", "date"]).doUpdateSet({
            reserved_rooms: range.total_rooms,
          }),
        )
        .execute();
    }
  }

  console.log("✓ Seed complete.");
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
