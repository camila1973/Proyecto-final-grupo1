import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "../src/database/database.types.js";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5436/travelhub",
    }),
  }),
});

const EFFECTIVE_FROM = "2020-01-01";

// ─── UUIDs — must match inventory-service/scripts/seed.ts ─────────────────────

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── Tax rules ────────────────────────────────────────────────────────────────
// city values are stored lowercase-normalised to match TaxRulesRepository.findApplicable
// and inventory-service city names (e.g. "Cancún" → "cancún")

const TAX_RULES = [
  // Mexico — National VAT
  {
    country: "MX",
    city: null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: 16.0,
    flat_amount: null,
    notes: "National VAT",
  },
  // Mexico — City hotel tax (ISH)
  {
    country: "MX",
    city: "cancún",
    tax_name: "ISH",
    tax_type: "PERCENTAGE",
    rate: 3.0,
    flat_amount: null,
    notes: "City hotel tax",
  },
  {
    country: "MX",
    city: "ciudad de méxico",
    tax_name: "ISH",
    tax_type: "PERCENTAGE",
    rate: 3.0,
    flat_amount: null,
    notes: "City hotel tax",
  },
  // Colombia
  {
    country: "CO",
    city: null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: 19.0,
    flat_amount: null,
    notes: "National VAT",
  },
  {
    country: "CO",
    city: null,
    tax_name: "INC",
    tax_type: "PERCENTAGE",
    rate: 8.0,
    flat_amount: null,
    notes: "Consumption tax on lodging",
  },
  // Peru
  {
    country: "PE",
    city: null,
    tax_name: "IGV",
    tax_type: "PERCENTAGE",
    rate: 18.0,
    flat_amount: null,
    notes: "National VAT",
  },
  // Ecuador
  {
    country: "EC",
    city: null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: 15.0,
    flat_amount: null,
    notes: "National VAT",
  },
  // Chile
  {
    country: "CL",
    city: null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: 19.0,
    flat_amount: null,
    notes: "National VAT",
  },
  // Argentina
  {
    country: "AR",
    city: null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: 21.0,
    flat_amount: null,
    notes: "National VAT",
  },
  {
    country: "AR",
    city: null,
    tax_name: "IIBB",
    tax_type: "PERCENTAGE",
    rate: 3.0,
    flat_amount: null,
    notes: "Provincial gross income tax",
  },
];

// ─── Room location cache ──────────────────────────────────────────────────────
// Mirrors inventory-service property city/country_code values, lowercased.
// In production this is populated by inventory.room.upserted events.

const ROOM_LOCATIONS = [
  {
    room_id: ROOM(1),
    property_id: PROP_CANCUN_1,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(2),
    property_id: PROP_CANCUN_1,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(3),
    property_id: PROP_CANCUN_2,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(4),
    property_id: PROP_CANCUN_2,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(5),
    property_id: PROP_CANCUN_2,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(6),
    property_id: PROP_CANCUN_3,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(7),
    property_id: PROP_CANCUN_3,
    country: "MX",
    city: "cancún",
  },
  {
    room_id: ROOM(8),
    property_id: PROP_CDMX_1,
    country: "MX",
    city: "ciudad de méxico",
  },
  {
    room_id: ROOM(9),
    property_id: PROP_CDMX_1,
    country: "MX",
    city: "ciudad de méxico",
  },
  {
    room_id: ROOM(10),
    property_id: PROP_CDMX_2,
    country: "MX",
    city: "ciudad de méxico",
  },
];

// ─── Price validation cache ───────────────────────────────────────────────────
// Base prices mirror inventory-service room base_price_usd values.
// In production this is populated by inventory.price.updated events.

const PRICE_PERIODS = [
  { room_id: ROOM(1), price_usd: "320.00" },
  { room_id: ROOM(2), price_usd: "580.00" },
  { room_id: ROOM(3), price_usd: "145.00" },
  { room_id: ROOM(4), price_usd: "195.00" },
  { room_id: ROOM(5), price_usd: "265.00" },
  { room_id: ROOM(6), price_usd: "65.00" },
  { room_id: ROOM(7), price_usd: "55.00" },
  { room_id: ROOM(8), price_usd: "280.00" },
  { room_id: ROOM(9), price_usd: "650.00" },
  { room_id: ROOM(10), price_usd: "110.00" },
];

const PRICE_PERIOD_FROM = "2026-01-01";
const PRICE_PERIOD_TO = "2027-12-31";

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Clearing tables...");
  await db.deleteFrom("partner_fees").execute();
  await db.deleteFrom("tax_rules").execute();
  await db.deleteFrom("price_validation_cache").execute();
  await db.deleteFrom("room_location_cache").execute();

  // Tax rules
  console.log(`Seeding ${TAX_RULES.length} tax rules...`);
  for (const rule of TAX_RULES) {
    await db
      .insertInto("tax_rules")
      .values({
        country: rule.country,
        city: rule.city ?? undefined,
        tax_name: rule.tax_name,
        tax_type: rule.tax_type,
        rate: rule.rate,
        flat_amount: rule.flat_amount ?? undefined,
        currency: "USD",
        applies_to: "ROOM_RATE",
        effective_from: EFFECTIVE_FROM,
        is_active: true,
      })
      .execute();
    const location = rule.city ? `${rule.country}/${rule.city}` : rule.country;
    console.log(`  ✓ ${rule.tax_name} @ ${rule.rate}% (${location})`);
  }

  // Room location cache
  console.log(`Seeding ${ROOM_LOCATIONS.length} room location entries...`);
  await db
    .insertInto("room_location_cache")
    .values(ROOM_LOCATIONS)
    .onConflict((oc) =>
      oc.column("room_id").doUpdateSet((eb) => ({
        property_id: eb.ref("excluded.property_id"),
        country: eb.ref("excluded.country"),
        city: eb.ref("excluded.city"),
      })),
    )
    .execute();
  for (const loc of ROOM_LOCATIONS) {
    console.log(`  ✓ ${loc.room_id.slice(-4)} → ${loc.country}/${loc.city}`);
  }

  // Price validation cache
  console.log(`Seeding ${PRICE_PERIODS.length} price cache entries...`);
  await db
    .insertInto("price_validation_cache")
    .values(
      PRICE_PERIODS.map((p) => ({
        room_id: p.room_id,
        from_date: PRICE_PERIOD_FROM,
        to_date: PRICE_PERIOD_TO,
        price_usd: p.price_usd,
      })),
    )
    .onConflict((oc) =>
      oc.columns(["room_id", "from_date", "to_date"]).doUpdateSet((eb) => ({
        price_usd: eb.ref("excluded.price_usd"),
      })),
    )
    .execute();
  for (const p of PRICE_PERIODS) {
    console.log(`  ✓ ${p.room_id.slice(-4)} → $${p.price_usd}/night`);
  }

  console.log("Seed complete.");
  await (db as any).destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
