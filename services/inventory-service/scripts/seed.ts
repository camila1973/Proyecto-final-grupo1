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
        neighborhood: "Zona Hotelera",
        lat: 21.1619,
        lon: -86.8515,
        rating: "4.7",
        review_count: 842,
        thumbnail_url: "https://placehold.co/400x300?text=Gran+Caribe",
        amenities: [
          "pool",
          "wifi",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "beach_access",
          "gym",
        ],
        phone: "+52 998 881 0000",
        email: "reservas@grancaribe.com",
        address: "Blvd. Kukulcan Km 11.5, Zona Hotelera",
        currency: "MXN",
        timezone: "America/Cancun",
        description:
          "Resort de lujo todo incluido frente al mar Caribe, con servicio premium, spa de clase mundial y experiencias gastronómicas internacionales.",
      },
      {
        id: PROP_CANCUN_2,
        name: "Playa Azul Hotel",
        type: "hotel",
        city: "Cancún",
        country_code: "MX",
        stars: 4,
        partner_id: PARTNER_1,
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
        amenities: [
          "pool",
          "wifi",
          "ac",
          "restaurant",
          "parking",
          "beach_access",
          "spa",
        ],
        phone: "+52 998 884 2300",
        email: "contacto@playaazul.mx",
        address: "Blvd. Kukulcan Km 8.5, Zona Hotelera",
        currency: "MXN",
        timezone: "America/Cancun",
        description:
          "Hotel boutique de cuatro estrellas a pie de playa, ideal para parejas y viajes de negocios cortos.",
      },
      {
        id: PROP_CANCUN_3,
        name: "Hostal Sol Cancún",
        type: "hostel",
        city: "Cancún",
        country_code: "MX",
        stars: 3,
        partner_id: PARTNER_2,
        neighborhood: "Downtown",
        lat: 21.1743,
        lon: -86.8466,
        rating: "3.8",
        review_count: 204,
        thumbnail_url: "https://placehold.co/400x300?text=Hostal+Sol",
        amenities: ["wifi", "ac", "parking"],
        phone: "+52 998 887 1122",
        email: "hola@hostalsolcancun.com",
        address: "Av. Tulum 220, Centro",
        currency: "MXN",
        timezone: "America/Cancun",
        description:
          "Hostal económico en el centro de Cancún con habitaciones privadas y compartidas, a 15 minutos de la zona hotelera.",
      },
      {
        id: PROP_CDMX_1,
        name: "Hotel Histórico Centro",
        type: "hotel",
        city: "Ciudad de México",
        country_code: "MX",
        stars: 5,
        partner_id: PARTNER_2,
        neighborhood: "Centro Histórico",
        lat: 19.4326,
        lon: -99.1332,
        rating: "4.6",
        review_count: 631,
        thumbnail_url: "https://placehold.co/400x300?text=Hotel+Historico",
        amenities: [
          "wifi",
          "gym",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "parking",
          "pet_friendly",
        ],
        phone: "+52 55 5510 4040",
        email: "info@hotelhistorico.mx",
        address: "Av. 16 de Septiembre 82, Centro Histórico",
        currency: "MXN",
        timezone: "America/Mexico_City",
        description:
          "Hotel cinco estrellas en un edificio del siglo XIX restaurado, a una cuadra del Zócalo y de los principales museos.",
      },
      {
        id: PROP_CDMX_2,
        name: "Condesa Inn",
        type: "hotel",
        city: "Ciudad de México",
        country_code: "MX",
        stars: 4,
        partner_id: PARTNER_2,
        neighborhood: "Condesa",
        lat: 19.4118,
        lon: -99.1718,
        rating: "4.4",
        review_count: 387,
        thumbnail_url: "https://placehold.co/400x300?text=Condesa+Inn",
        amenities: ["wifi", "breakfast", "ac", "pet_friendly"],
        phone: "+52 55 5212 0808",
        email: "reservas@condesainn.com",
        address: "Av. México 70, Condesa",
        currency: "MXN",
        timezone: "America/Mexico_City",
        description:
          "Inn moderno en el corazón de la Condesa, rodeado de cafeterías, parques y vida cultural. Pet-friendly.",
      },
    ])
    .execute();

  // ── Rooms ─────────────────────────────────────────────────────────────────
  console.log("Seeding inv_rooms...");
  await db
    .insertInto("inv_rooms")
    .values([
      // ── Gran Caribe Resort & Spa — 5★ Cancún beachfront resort ────────────
      {
        id: ROOM(1),
        property_id: PROP_CANCUN_1,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        total_rooms: 80,
        base_price_usd: "320.00",
      },
      {
        id: ROOM(2),
        property_id: PROP_CANCUN_1,
        room_type: "suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 4,
        total_rooms: 25,
        base_price_usd: "580.00",
      },
      // ── Playa Azul Hotel — 4★ mid-size hotel ──────────────────────────────
      {
        id: ROOM(3),
        property_id: PROP_CANCUN_2,
        room_type: "standard",
        bed_type: "queen",
        view_type: "pool",
        capacity: 2,
        total_rooms: 90,
        base_price_usd: "145.00",
      },
      {
        id: ROOM(4),
        property_id: PROP_CANCUN_2,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        total_rooms: 50,
        base_price_usd: "195.00",
      },
      {
        id: ROOM(5),
        property_id: PROP_CANCUN_2,
        room_type: "junior_suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 3,
        total_rooms: 18,
        base_price_usd: "265.00",
      },
      // ── Hostal Sol Cancún — hostel ────────────────────────────────────────
      {
        id: ROOM(6),
        property_id: PROP_CANCUN_3,
        room_type: "standard",
        bed_type: "double",
        view_type: "city",
        capacity: 2,
        total_rooms: 22,
        base_price_usd: "65.00",
      },
      {
        id: ROOM(7),
        property_id: PROP_CANCUN_3,
        room_type: "standard",
        bed_type: "twin",
        view_type: "garden",
        capacity: 2,
        total_rooms: 18,
        base_price_usd: "55.00",
      },
      // ── Hotel Histórico Centro — 4★ CDMX heritage hotel ───────────────────
      {
        id: ROOM(8),
        property_id: PROP_CDMX_1,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "city",
        capacity: 2,
        total_rooms: 35,
        base_price_usd: "280.00",
      },
      {
        id: ROOM(9),
        property_id: PROP_CDMX_1,
        room_type: "penthouse",
        bed_type: "king",
        view_type: "city",
        capacity: 4,
        total_rooms: 2,
        base_price_usd: "650.00",
      },
      // ── Condesa Inn — boutique hotel ──────────────────────────────────────
      {
        id: ROOM(10),
        property_id: PROP_CDMX_2,
        room_type: "standard",
        bed_type: "queen",
        view_type: "garden",
        capacity: 2,
        total_rooms: 28,
        base_price_usd: "110.00",
      },
    ])
    .execute();

  // ── Room rates — aligned with search-service price_periods ───────────────
  console.log("Seeding inv_room_rates...");
  await db
    .insertInto("inv_room_rates")
    .values([
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
      {
        room_id: ROOM(3),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "135.00",
      },
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
      {
        room_id: ROOM(5),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "250.00",
      },
      {
        room_id: ROOM(6),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "60.00",
      },
      {
        room_id: ROOM(7),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "50.00",
      },
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
      {
        room_id: ROOM(9),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "620.00",
      },
      {
        room_id: ROOM(10),
        from_date: new Date("2027-01-01"),
        to_date: new Date("2027-12-31"),
        price_usd: "105.00",
      },
    ])
    .execute();

  // ── Availability ──────────────────────────────────────────────────────────
  console.log("Seeding inv_availability...");
  const bookedRanges: Array<{
    room_id: string;
    from_date: string;
    to_date: string;
    total_rooms: number;
  }> = [
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
    {
      room_id: ROOM(2),
      from_date: "2027-04-02",
      to_date: "2027-04-07",
      total_rooms: 2,
    },
    {
      room_id: ROOM(4),
      from_date: "2027-03-30",
      to_date: "2027-04-05",
      total_rooms: 3,
    },
    {
      room_id: ROOM(5),
      from_date: "2027-05-01",
      to_date: "2027-05-08",
      total_rooms: 2,
    },
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
