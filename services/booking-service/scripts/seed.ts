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

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const FEE = (n: number) =>
  `d1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const BOOKER = (n: number) =>
  `e1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const GUEST_INFO = [
  {
    firstName: "Carlos",
    lastName: "García",
    email: "carlos.garcia@example.com",
    phone: "+52 55 1234 5678",
  },
  {
    firstName: "María",
    lastName: "López",
    email: "maria.lopez@example.com",
    phone: "+52 55 9876 5432",
  },
  {
    firstName: "Andrés",
    lastName: "Martínez",
    email: "andres.martinez@example.com",
  },
];

const RES = (n: number) =>
  `f1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

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

// ─── Partner fees ─────────────────────────────────────────────────────────────
// Sample fees for the two seeded partners.
// IDs are stable (d1000000-...) so search-service seed can reference them.

const PARTNER_FEES = [
  // Partner 1 — resort fee applied per night across all Cancún properties
  {
    id: FEE(1),
    partner_id: PARTNER_1,
    property_id: null as string | null,
    fee_name: "Resort Fee",
    fee_type: "FLAT_PER_NIGHT",
    rate: null as number | null,
    flat_amount: 25.0,
    currency: "USD",
    effective_from: EFFECTIVE_FROM,
    effective_to: null as string | null,
  },
  // Partner 2 — one-time cleaning fee per stay
  {
    id: FEE(2),
    partner_id: PARTNER_2,
    property_id: null as string | null,
    fee_name: "Cleaning Fee",
    fee_type: "FLAT_PER_STAY",
    rate: null as number | null,
    flat_amount: 15.0,
    currency: "USD",
    effective_from: EFFECTIVE_FROM,
    effective_to: null as string | null,
  },
];

// ─── Reservations ─────────────────────────────────────────────────────────────
// Pre-computed fare breakdowns aligned with inventory-service rates and
// the tax/fee rules seeded above.
//
// MX taxes: IVA 16% + ISH 3% (Cancún and Ciudad de México)
// Partner 1 fee: Resort Fee $25/night (FLAT_PER_NIGHT)
// Partner 2 fee: Cleaning Fee $15/stay (FLAT_PER_STAY)
//
// hold_expires_at lifecycle:
//   • Set when the reservation is created (POST /reservations) — taken from the
//     Redis hold payload (expiresAt = time-of-hold + 900 s), never now+15min.
//   • Confirmed rows retain the original value (sweeper ignores status ≠ 'pending').
//   • Pending rows: sweeper expires them once hold_expires_at < now().
//   • The seed provides plausible past values for confirmed rows and a live
//     15-minute window for the pending row.

const HOLD_TTL_MS = 900_000; // 900 s — matches holds.service.ts HOLD_TTL_SECONDS

const RESERVATIONS = [
  // ── confirmed — Gran Caribe, Deluxe King (room 1), 3 nights @ $310 ─────────
  // Hold placed ~2026-04-01, reservation confirmed same day.
  {
    id: RES(1),
    property_id: PROP_CANCUN_1,
    room_id: ROOM(1),
    partner_id: PARTNER_1,
    booker_id: BOOKER(1),
    guest_info: GUEST_INFO[0],
    check_in: "2027-03-01",
    check_out: "2027-03-04",
    status: "confirmed",
    fare_breakdown: {
      nights: 3,
      roomRateUsd: 310,
      subtotalUsd: 930,
      taxes: [
        { name: "IVA", type: "PERCENTAGE", rate: 16, amountUsd: 148.8 },
        { name: "ISH", type: "PERCENTAGE", rate: 3, amountUsd: 27.9 },
      ],
      fees: [{ name: "Resort Fee", type: "FLAT_PER_NIGHT", amountUsd: 75 }],
      taxTotalUsd: 176.7,
      feeTotalUsd: 75,
      totalUsd: 1181.7,
    },
    tax_total_usd: 176.7,
    fee_total_usd: 75,
    grand_total_usd: 1181.7,
    hold_expires_at: new Date("2026-04-01T10:15:00.000Z"),
  },
  // ── confirmed — Gran Caribe, Ocean Suite (room 2), 4 nights @ $370 ─────────
  // Hold placed ~2026-04-05, reservation confirmed same day.
  {
    id: RES(2),
    property_id: PROP_CANCUN_1,
    room_id: ROOM(2),
    partner_id: PARTNER_1,
    booker_id: BOOKER(1),
    guest_info: GUEST_INFO[0],
    check_in: "2027-07-05",
    check_out: "2027-07-09",
    status: "confirmed",
    fare_breakdown: {
      nights: 4,
      roomRateUsd: 370,
      subtotalUsd: 1480,
      taxes: [
        { name: "IVA", type: "PERCENTAGE", rate: 16, amountUsd: 236.8 },
        { name: "ISH", type: "PERCENTAGE", rate: 3, amountUsd: 44.4 },
      ],
      fees: [{ name: "Resort Fee", type: "FLAT_PER_NIGHT", amountUsd: 100 }],
      taxTotalUsd: 281.2,
      feeTotalUsd: 100,
      totalUsd: 1861.2,
    },
    tax_total_usd: 281.2,
    fee_total_usd: 100,
    grand_total_usd: 1861.2,
    hold_expires_at: new Date("2026-04-05T14:30:00.000Z"),
  },
  // ── confirmed — Hotel Histórico CDMX, Deluxe King (room 8), 3 nights @ $270 ─
  // Hold placed ~2026-04-10, reservation confirmed same day.
  {
    id: RES(3),
    property_id: PROP_CDMX_1,
    room_id: ROOM(8),
    partner_id: PARTNER_2,
    booker_id: BOOKER(2),
    guest_info: GUEST_INFO[1],
    check_in: "2027-02-10",
    check_out: "2027-02-13",
    status: "confirmed",
    fare_breakdown: {
      nights: 3,
      roomRateUsd: 270,
      subtotalUsd: 810,
      taxes: [
        { name: "IVA", type: "PERCENTAGE", rate: 16, amountUsd: 129.6 },
        { name: "ISH", type: "PERCENTAGE", rate: 3, amountUsd: 24.3 },
      ],
      fees: [{ name: "Cleaning Fee", type: "FLAT_PER_STAY", amountUsd: 15 }],
      taxTotalUsd: 153.9,
      feeTotalUsd: 15,
      totalUsd: 978.9,
    },
    tax_total_usd: 153.9,
    fee_total_usd: 15,
    grand_total_usd: 978.9,
    hold_expires_at: new Date("2026-04-10T09:00:00.000Z"),
  },
  // ── submitted — Hostal Sol Cancún, Standard Double (room 6), 3 nights @ $60 ──
  // Hold placed just now via POST /holds; reservation submitted immediately after.
  // hold_expires_at mirrors the Redis TTL so the sweeper fires at the right moment.
  {
    id: RES(4),
    property_id: PROP_CANCUN_3,
    room_id: ROOM(6),
    partner_id: PARTNER_2,
    booker_id: BOOKER(3),
    guest_info: GUEST_INFO[2],
    check_in: "2027-05-10",
    check_out: "2027-05-13",
    status: "submitted",
    fare_breakdown: {
      nights: 3,
      roomRateUsd: 60,
      subtotalUsd: 180,
      taxes: [
        { name: "IVA", type: "PERCENTAGE", rate: 16, amountUsd: 28.8 },
        { name: "ISH", type: "PERCENTAGE", rate: 3, amountUsd: 5.4 },
      ],
      fees: [{ name: "Cleaning Fee", type: "FLAT_PER_STAY", amountUsd: 15 }],
      taxTotalUsd: 34.2,
      feeTotalUsd: 15,
      totalUsd: 229.2,
    },
    tax_total_usd: 34.2,
    fee_total_usd: 15,
    grand_total_usd: 229.2,
    hold_expires_at: new Date(Date.now() + HOLD_TTL_MS),
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Clearing tables...");
  await db.deleteFrom("reservations").execute();
  await db.deleteFrom("partner_fees").execute();
  await db.deleteFrom("tax_rules").execute();

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

  // Partner fees
  console.log(`Seeding ${PARTNER_FEES.length} partner fee entries...`);
  await db
    .insertInto("partner_fees")
    .values(
      PARTNER_FEES.map((f) => ({
        id: f.id,
        partner_id: f.partner_id,
        property_id: f.property_id ?? undefined,
        fee_name: f.fee_name,
        fee_type: f.fee_type,
        rate: f.rate ?? undefined,
        flat_amount: f.flat_amount ?? undefined,
        currency: f.currency,
        effective_from: f.effective_from,
        effective_to: f.effective_to ?? undefined,
        is_active: true,
      })),
    )
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        fee_name: eb.ref("excluded.fee_name"),
        fee_type: eb.ref("excluded.fee_type"),
        flat_amount: eb.ref("excluded.flat_amount"),
        rate: eb.ref("excluded.rate"),
        is_active: eb.ref("excluded.is_active"),
      })),
    )
    .execute();
  for (const f of PARTNER_FEES) {
    console.log(
      `  ✓ ${f.fee_name} (${f.fee_type}) → partner ${f.partner_id.slice(-4)}`,
    );
  }

  // Reservations
  console.log(`Seeding ${RESERVATIONS.length} reservations...`);
  for (const r of RESERVATIONS) {
    await db
      .insertInto("reservations")
      .values({
        id: r.id,
        property_id: r.property_id,
        room_id: r.room_id,
        partner_id: r.partner_id,
        booker_id: r.booker_id,
        guest_info: r.guest_info,
        check_in: r.check_in,
        check_out: r.check_out,
        status: r.status,
        fare_breakdown: r.fare_breakdown,
        tax_total_usd: r.tax_total_usd,
        fee_total_usd: r.fee_total_usd,
        grand_total_usd: r.grand_total_usd,
        hold_expires_at: r.hold_expires_at ?? undefined,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          status: eb.ref("excluded.status"),
          fare_breakdown: eb.ref("excluded.fare_breakdown"),
          grand_total_usd: eb.ref("excluded.grand_total_usd"),
        })),
      )
      .execute();
    console.log(
      `  ✓ ${r.status.padEnd(9)} ${r.check_in} → ${r.check_out}  booker …${r.booker_id.slice(-4)}  guest ${r.guest_info.firstName} ${r.guest_info.lastName}  total $${r.grand_total_usd}`,
    );
  }

  console.log("Seed complete.");
  await (db as any).destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
