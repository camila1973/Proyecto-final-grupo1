import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { SearchDatabase } from "../src/database/database.types.js";

const db = new Kysely<SearchDatabase>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5433/search_service",
    }),
  }),
});

// ─── UUIDs ────────────────────────────────────────────────────────────────────

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Truncating tables...");
  await sql`TRUNCATE room_price_periods, room_search_index, taxonomy_values, taxonomy_categories RESTART IDENTITY CASCADE`.execute(
    db,
  );

  // ── Taxonomy categories ───────────────────────────────────────────────────
  console.log("Seeding taxonomy_categories...");
  const categories = await db
    .insertInto("taxonomy_categories")
    .values([
      {
        code: "amenities",
        label: "Amenities",
        filter_type: "multi",
        display_order: 1,
        is_active: true,
      },
      {
        code: "room_type",
        label: "Room Type",
        filter_type: "single",
        display_order: 2,
        is_active: true,
      },
      {
        code: "bed_type",
        label: "Bed Type",
        filter_type: "single",
        display_order: 3,
        is_active: true,
      },
      {
        code: "view_type",
        label: "View Type",
        filter_type: "single",
        display_order: 4,
        is_active: true,
      },
    ])
    .returning(["id", "code"])
    .execute();

  const catId = (code: string) => categories.find((c) => c.code === code)!.id;

  // ── Taxonomy values ───────────────────────────────────────────────────────
  console.log("Seeding taxonomy_values...");
  await db
    .insertInto("taxonomy_values")
    .values([
      // amenities
      {
        category_id: catId("amenities"),
        code: "pool",
        label: "Pool",
        display_order: 1,
      },
      {
        category_id: catId("amenities"),
        code: "wifi",
        label: "Free WiFi",
        display_order: 2,
      },
      {
        category_id: catId("amenities"),
        code: "parking",
        label: "Parking",
        display_order: 3,
      },
      {
        category_id: catId("amenities"),
        code: "gym",
        label: "Gym",
        display_order: 4,
      },
      {
        category_id: catId("amenities"),
        code: "spa",
        label: "Spa",
        display_order: 5,
      },
      {
        category_id: catId("amenities"),
        code: "restaurant",
        label: "Restaurant",
        display_order: 6,
      },
      {
        category_id: catId("amenities"),
        code: "breakfast",
        label: "Breakfast",
        display_order: 7,
      },
      {
        category_id: catId("amenities"),
        code: "ac",
        label: "Air Conditioning",
        display_order: 8,
      },
      {
        category_id: catId("amenities"),
        code: "pet_friendly",
        label: "Pet Friendly",
        display_order: 9,
      },
      {
        category_id: catId("amenities"),
        code: "beach_access",
        label: "Beach Access",
        display_order: 10,
      },
      // room_type
      {
        category_id: catId("room_type"),
        code: "standard",
        label: "Standard",
        display_order: 1,
      },
      {
        category_id: catId("room_type"),
        code: "deluxe",
        label: "Deluxe",
        display_order: 2,
      },
      {
        category_id: catId("room_type"),
        code: "suite",
        label: "Suite",
        display_order: 3,
      },
      {
        category_id: catId("room_type"),
        code: "junior_suite",
        label: "Junior Suite",
        display_order: 4,
      },
      {
        category_id: catId("room_type"),
        code: "penthouse",
        label: "Penthouse",
        display_order: 5,
      },
      // bed_type
      {
        category_id: catId("bed_type"),
        code: "single",
        label: "Single",
        display_order: 1,
      },
      {
        category_id: catId("bed_type"),
        code: "twin",
        label: "Twin",
        display_order: 2,
      },
      {
        category_id: catId("bed_type"),
        code: "double",
        label: "Double",
        display_order: 3,
      },
      {
        category_id: catId("bed_type"),
        code: "queen",
        label: "Queen",
        display_order: 4,
      },
      {
        category_id: catId("bed_type"),
        code: "king",
        label: "King",
        display_order: 5,
      },
      // view_type
      {
        category_id: catId("view_type"),
        code: "garden",
        label: "Garden View",
        display_order: 1,
      },
      {
        category_id: catId("view_type"),
        code: "city",
        label: "City View",
        display_order: 2,
      },
      {
        category_id: catId("view_type"),
        code: "ocean",
        label: "Ocean View",
        display_order: 3,
      },
      {
        category_id: catId("view_type"),
        code: "mountain",
        label: "Mountain View",
        display_order: 4,
      },
      {
        category_id: catId("view_type"),
        code: "pool_view",
        label: "Pool View",
        display_order: 5,
      },
    ])
    .execute();

  // ── room_search_index ─────────────────────────────────────────────────────
  console.log("Seeding room_search_index...");
  await db
    .insertInto("room_search_index")
    .values([
      // ── Cancún: Gran Caribe Resort (5★) ──────────────────────────────────
      // tax_rate_pct: MX IVA 16% + Cancún ISH 3% = 19%
      // flat_fee_per_night_usd: Partner 1 Resort Fee $25/night
      {
        room_id: ROOM(1),
        property_id: PROP_CANCUN_1,
        partner_id: PARTNER_1,
        property_name: "Gran Caribe Resort & Spa",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1619,
        lon: -86.8515,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
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
        base_price_usd: "320.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 5,
        rating: "4.7",
        review_count: 842,
        thumbnail_url: "https://placehold.co/400x300?text=Gran+Caribe",
      },
      {
        room_id: ROOM(2),
        property_id: PROP_CANCUN_1,
        partner_id: PARTNER_1,
        property_name: "Gran Caribe Resort & Spa",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1619,
        lon: -86.8515,
        room_type: "suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 4,
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
        base_price_usd: "580.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 5,
        rating: "4.7",
        review_count: 842,
        thumbnail_url: "https://placehold.co/400x300?text=Gran+Caribe",
      },
      // ── Cancún: Playa Azul Hotel (4★) ────────────────────────────────────
      {
        room_id: ROOM(3),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "standard",
        bed_type: "queen",
        view_type: "pool",
        capacity: 2,
        amenities: ["pool", "wifi", "ac", "restaurant", "parking"],
        base_price_usd: "145.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      {
        room_id: ROOM(4),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        amenities: [
          "pool",
          "wifi",
          "ac",
          "restaurant",
          "parking",
          "beach_access",
        ],
        base_price_usd: "195.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      {
        room_id: ROOM(5),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "junior_suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 3,
        amenities: [
          "pool",
          "wifi",
          "ac",
          "restaurant",
          "parking",
          "beach_access",
          "spa",
        ],
        base_price_usd: "265.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      // ── Cancún: Hostal Sol (3★) ───────────────────────────────────────────
      // flat_fee_per_stay_usd: Partner 2 Cleaning Fee $15/stay
      {
        room_id: ROOM(6),
        property_id: PROP_CANCUN_3,
        partner_id: PARTNER_2,
        property_name: "Hostal Sol Cancún",
        city: "Cancún",
        country: "MX",
        neighborhood: "Downtown",
        lat: 21.1743,
        lon: -86.8466,
        room_type: "standard",
        bed_type: "double",
        view_type: "city",
        capacity: 2,
        amenities: ["wifi", "ac", "parking"],
        base_price_usd: "65.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 3,
        rating: "3.8",
        review_count: 204,
        thumbnail_url: "https://placehold.co/400x300?text=Hostal+Sol",
      },
      {
        room_id: ROOM(7),
        property_id: PROP_CANCUN_3,
        partner_id: PARTNER_2,
        property_name: "Hostal Sol Cancún",
        city: "Cancún",
        country: "MX",
        neighborhood: "Downtown",
        lat: 21.1743,
        lon: -86.8466,
        room_type: "standard",
        bed_type: "twin",
        view_type: "garden",
        capacity: 2,
        amenities: ["wifi", "ac"],
        base_price_usd: "55.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 3,
        rating: "3.8",
        review_count: 204,
        thumbnail_url: "https://placehold.co/400x300?text=Hostal+Sol",
      },
      // ── CDMX: Hotel Histórico (5★) ────────────────────────────────────────
      // tax_rate_pct: MX IVA 16% + CDMX ISH 3% = 19%
      // flat_fee_per_stay_usd: Partner 2 Cleaning Fee $15/stay
      {
        room_id: ROOM(8),
        property_id: PROP_CDMX_1,
        partner_id: PARTNER_2,
        property_name: "Hotel Histórico Centro",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Centro Histórico",
        lat: 19.4326,
        lon: -99.1332,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "city",
        capacity: 2,
        amenities: [
          "wifi",
          "gym",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "parking",
        ],
        base_price_usd: "280.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 5,
        rating: "4.6",
        review_count: 631,
        thumbnail_url: "https://placehold.co/400x300?text=Hotel+Historico",
      },
      {
        room_id: ROOM(9),
        property_id: PROP_CDMX_1,
        partner_id: PARTNER_2,
        property_name: "Hotel Histórico Centro",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Centro Histórico",
        lat: 19.4326,
        lon: -99.1332,
        room_type: "penthouse",
        bed_type: "king",
        view_type: "city",
        capacity: 4,
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
        base_price_usd: "650.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 5,
        rating: "4.6",
        review_count: 631,
        thumbnail_url: "https://placehold.co/400x300?text=Hotel+Historico",
      },
      // ── CDMX: Condesa Inn (4★) ────────────────────────────────────────────
      {
        room_id: ROOM(10),
        property_id: PROP_CDMX_2,
        partner_id: PARTNER_2,
        property_name: "Condesa Inn",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Condesa",
        lat: 19.4118,
        lon: -99.1718,
        room_type: "standard",
        bed_type: "queen",
        view_type: "garden",
        capacity: 2,
        amenities: ["wifi", "breakfast", "ac", "pet_friendly"],
        base_price_usd: "110.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 4,
        rating: "4.4",
        review_count: 387,
        thumbnail_url: "https://placehold.co/400x300?text=Condesa+Inn",
      },
    ])
    .execute();

  // ── room_price_periods ────────────────────────────────────────────────────
  // Seasonal pricing periods. Rooms are available by default; only explicit
  // bookings (room_booked_ranges) exclude them from search results.
  console.log("Seeding room_price_periods...");

  // Per-room seasonal price map: [low_season, high_season (Jul-Aug), shoulder]
  const pricePeriods: Array<{
    room_id: string;
    from_date: string;
    to_date: string;
    price_usd: string;
  }> = [
    // ROOM 1 – Gran Caribe Resort & Spa, deluxe king ocean
    {
      room_id: ROOM(1),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "310.00",
    },
    {
      room_id: ROOM(1),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "370.00",
    },
    {
      room_id: ROOM(1),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "330.00",
    },
    // ROOM 2 – Gran Caribe Resort & Spa, suite king ocean
    {
      room_id: ROOM(2),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "560.00",
    },
    {
      room_id: ROOM(2),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "650.00",
    },
    {
      room_id: ROOM(2),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "590.00",
    },
    // ROOM 3 – Playa Azul Hotel, standard queen pool
    {
      room_id: ROOM(3),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "135.00",
    },
    // ROOM 4 – Playa Azul Hotel, deluxe king ocean
    {
      room_id: ROOM(4),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "185.00",
    },
    {
      room_id: ROOM(4),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "220.00",
    },
    {
      room_id: ROOM(4),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "195.00",
    },
    // ROOM 5 – Playa Azul Hotel, junior suite king ocean
    {
      room_id: ROOM(5),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "250.00",
    },
    // ROOM 6 – Hostal Sol Cancún, standard double city
    {
      room_id: ROOM(6),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "60.00",
    },
    // ROOM 7 – Hostal Sol Cancún, standard twin garden
    {
      room_id: ROOM(7),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "50.00",
    },
    // ROOM 8 – Hotel Histórico Centro, deluxe king city
    {
      room_id: ROOM(8),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "270.00",
    },
    {
      room_id: ROOM(8),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "320.00",
    },
    {
      room_id: ROOM(8),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "285.00",
    },
    // ROOM 9 – Hotel Histórico Centro, penthouse king city
    {
      room_id: ROOM(9),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "620.00",
    },
    // ROOM 10 – Condesa Inn, standard queen garden
    {
      room_id: ROOM(10),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "105.00",
    },
  ];

  await db.insertInto("room_price_periods").values(pricePeriods).execute();

  console.log("✓ Seed complete.");
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
