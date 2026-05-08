import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "../src/database/database.types.js";

// IMPORTANT: UUIDs and amounts here MUST stay aligned with
// services/booking-service/scripts/seed.ts. Each payment row references a
// reservation seeded there, with its grand_total/tax/fee copied verbatim.

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5437/travelhub",
    }),
  }),
});

const COMMISSION_RATE = 0.2;

// ─── UUIDs — mirror booking-service / inventory-service ───────────────────────

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";

const RES = (n: number) =>
  `f1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const PAY = (n: number) =>
  `91000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const ADJ = (n: number) =>
  `92000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Breakdown {
  gross: number;
  tax: number;
  fee: number;
  fareSnapshot: Record<string, unknown>;
}

function captured(
  paymentId: string,
  reservationId: string,
  partnerId: string,
  propertyId: string,
  propertyName: string,
  guestEmail: string,
  capturedAt: Date,
  intent: string,
  breakdown: Breakdown,
) {
  const commission = round2(breakdown.gross * COMMISSION_RATE);
  const net = round2(breakdown.gross - commission);
  return {
    id: paymentId,
    reservation_id: reservationId,
    stripe_payment_intent_id: intent,
    stripe_payment_method_id: "pm_seed_card_visa",
    amount_usd: breakdown.gross,
    currency: "usd",
    status: "captured",
    failure_reason: null,
    guest_email: guestEmail,
    partner_id: partnerId,
    property_id: propertyId,
    property_name: propertyName,
    gross_amount_usd: breakdown.gross,
    tax_amount_usd: breakdown.tax,
    partner_fee_usd: breakdown.fee,
    commission_rate: COMMISSION_RATE,
    commission_amount_usd: commission,
    net_payout_usd: net,
    fare_snapshot: breakdown.fareSnapshot,
    captured_at: capturedAt,
  };
}

// ─── Fare snapshots (mirror booking-service seed) ─────────────────────────────

const FARE_GRAN_CARIBE_DELUXE_3N = {
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
};

const FARE_GRAN_CARIBE_SUITE_4N = {
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
};

const FARE_HISTORICO_DELUXE_3N = {
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
};

const FARE_HOSTAL_STANDARD_3N = {
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
};

// ─── Historical capture helper ───────────────────────────────────────────────
// Mirrors booking-service HISTORICAL_RESERVATIONS so each historical booking
// has a captured payment in the same month — drives the dashboard charts +
// per-month materialized disbursements.

type HistTemplate =
  | "gran_caribe_deluxe_3n"
  | "gran_caribe_suite_4n"
  | "historico_deluxe_3n"
  | "hostal_standard_3n";

const HIST_TEMPLATES: Record<
  HistTemplate,
  {
    partnerId: string;
    propertyId: string;
    propertyName: string;
    gross: number;
    tax: number;
    fee: number;
    fareSnapshot: Record<string, unknown>;
  }
> = {
  gran_caribe_deluxe_3n: {
    partnerId: PARTNER_1,
    propertyId: PROP_CANCUN_1,
    propertyName: "Gran Caribe Resort",
    gross: 1181.7,
    tax: 176.7,
    fee: 75,
    fareSnapshot: FARE_GRAN_CARIBE_DELUXE_3N,
  },
  gran_caribe_suite_4n: {
    partnerId: PARTNER_1,
    propertyId: PROP_CANCUN_1,
    propertyName: "Gran Caribe Resort",
    gross: 1861.2,
    tax: 281.2,
    fee: 100,
    fareSnapshot: FARE_GRAN_CARIBE_SUITE_4N,
  },
  historico_deluxe_3n: {
    partnerId: PARTNER_2,
    propertyId: PROP_CDMX_1,
    propertyName: "Hotel Histórico Centro",
    gross: 978.9,
    tax: 153.9,
    fee: 15,
    fareSnapshot: FARE_HISTORICO_DELUXE_3N,
  },
  hostal_standard_3n: {
    partnerId: PARTNER_2,
    propertyId: PROP_CANCUN_3,
    propertyName: "Hostal Sol Cancún",
    gross: 229.2,
    tax: 34.2,
    fee: 15,
    fareSnapshot: FARE_HOSTAL_STANDARD_3N,
  },
};

function hist(
  payN: number,
  resN: number,
  template: HistTemplate,
  capturedOn: string, // YYYY-MM-DD
  guestEmail: string,
) {
  const tpl = HIST_TEMPLATES[template];
  return captured(
    PAY(payN),
    RES(resN),
    tpl.partnerId,
    tpl.propertyId,
    tpl.propertyName,
    guestEmail,
    new Date(`${capturedOn}T12:00:00.000Z`),
    `pi_seed_${String(payN).padStart(3, "0")}`,
    {
      gross: tpl.gross,
      tax: tpl.tax,
      fee: tpl.fee,
      fareSnapshot: tpl.fareSnapshot,
    },
  );
}

// ─── Captured payments — span past months so the disbursements module ────────
// materializes one record per partner per past period.

const CAPTURED_PAYMENTS = [
  // RES(1): Gran Caribe / Deluxe — captured Jan 15, 2026 (PARTNER_1)
  captured(
    PAY(1),
    RES(1),
    PARTNER_1,
    PROP_CANCUN_1,
    "Gran Caribe Resort",
    "carlos.garcia@example.com",
    new Date("2026-01-15T14:00:00.000Z"),
    "pi_seed_001",
    {
      gross: 1181.7,
      tax: 176.7,
      fee: 75,
      fareSnapshot: FARE_GRAN_CARIBE_DELUXE_3N,
    },
  ),
  // RES(2): Gran Caribe / Suite — captured Feb 8, 2026 (PARTNER_1)
  captured(
    PAY(2),
    RES(2),
    PARTNER_1,
    PROP_CANCUN_1,
    "Gran Caribe Resort",
    "carlos.garcia@example.com",
    new Date("2026-02-08T10:30:00.000Z"),
    "pi_seed_002",
    {
      gross: 1861.2,
      tax: 281.2,
      fee: 100,
      fareSnapshot: FARE_GRAN_CARIBE_SUITE_4N,
    },
  ),
  // RES(3): Hotel Histórico CDMX / Deluxe — captured Mar 3, 2026 (PARTNER_2)
  captured(
    PAY(3),
    RES(3),
    PARTNER_2,
    PROP_CDMX_1,
    "Hotel Histórico Centro",
    "maria.lopez@example.com",
    new Date("2026-03-03T16:45:00.000Z"),
    "pi_seed_003",
    {
      gross: 978.9,
      tax: 153.9,
      fee: 15,
      fareSnapshot: FARE_HISTORICO_DELUXE_3N,
    },
  ),
  // RES(5): Gran Caribe / Deluxe — captured this month (PARTNER_1)
  // Lands in the current-month projected disbursement.
  captured(
    PAY(5),
    RES(5),
    PARTNER_1,
    PROP_CANCUN_1,
    "Gran Caribe Resort",
    "andres.martinez@example.com",
    new Date(),
    "pi_seed_005",
    {
      gross: 1181.7,
      tax: 176.7,
      fee: 75,
      fareSnapshot: FARE_GRAN_CARIBE_DELUXE_3N,
    },
  ),

  // ── Historical backfill — mirrors booking-service HISTORICAL_RESERVATIONS ──
  // captured_at ~1 week before each check_in, so each lands in the same month
  // and the trailing-6-month chart on the org dashboard has data points.

  // PARTNER_1 — Gran Caribe Hospitality Group
  hist(
    10,
    10,
    "gran_caribe_deluxe_3n",
    "2025-07-28",
    "carlos.garcia@example.com",
  ),
  hist(
    11,
    11,
    "gran_caribe_suite_4n",
    "2025-09-05",
    "carlos.garcia@example.com",
  ),
  hist(
    12,
    12,
    "gran_caribe_deluxe_3n",
    "2025-10-11",
    "andres.martinez@example.com",
  ),
  hist(
    13,
    13,
    "gran_caribe_suite_4n",
    "2025-11-15",
    "carlos.garcia@example.com",
  ),
  hist(
    14,
    14,
    "gran_caribe_deluxe_3n",
    "2025-11-28",
    "andres.martinez@example.com",
  ),
  hist(
    15,
    15,
    "gran_caribe_deluxe_3n",
    "2026-01-02",
    "carlos.garcia@example.com",
  ),
  hist(
    16,
    16,
    "gran_caribe_suite_4n",
    "2026-02-12",
    "andres.martinez@example.com",
  ),
  hist(
    17,
    17,
    "gran_caribe_deluxe_3n",
    "2026-04-04",
    "carlos.garcia@example.com",
  ),

  // PARTNER_2 — Sol Boutique Hotels & Hostales
  hist(20, 20, "historico_deluxe_3n", "2025-08-15", "maria.lopez@example.com"),
  hist(21, 21, "hostal_standard_3n", "2025-09-30", "maria.lopez@example.com"),
  hist(22, 22, "historico_deluxe_3n", "2025-11-08", "maria.lopez@example.com"),
  hist(
    23,
    23,
    "hostal_standard_3n",
    "2025-12-13",
    "andres.martinez@example.com",
  ),
  hist(24, 24, "historico_deluxe_3n", "2026-01-28", "maria.lopez@example.com"),
  hist(25, 25, "hostal_standard_3n", "2026-04-18", "maria.lopez@example.com"),
];

// ─── Pending payment — RES(4) is submitted but webhook hasn't fired yet ──────

const PENDING_PAYMENT = {
  id: PAY(4),
  reservation_id: RES(4),
  stripe_payment_intent_id: "pi_seed_004",
  stripe_payment_method_id: null,
  amount_usd: 229.2,
  currency: "usd",
  status: "pending",
  failure_reason: null,
  guest_email: "andres.martinez@example.com",
  partner_id: PARTNER_2,
  property_id: PROP_CANCUN_3,
  property_name: "Hostal Sol Cancún",
  gross_amount_usd: 229.2,
  tax_amount_usd: 34.2,
  partner_fee_usd: 15,
  commission_rate: COMMISSION_RATE,
  commission_amount_usd: round2(229.2 * COMMISSION_RATE),
  net_payout_usd: round2(229.2 * (1 - COMMISSION_RATE)),
  fare_snapshot: FARE_HOSTAL_STANDARD_3N,
  captured_at: null,
};

// ─── Adjustments — one partial refund against PAY(2) ─────────────────────────
// Demonstrates the schema; aggregator subtracts these from the disbursement
// period of `applied_at`.

const ADJUSTMENTS = [
  {
    id: ADJ(1),
    payment_id: PAY(2),
    kind: "refund",
    amount_usd: -200, // negative = money out
    applied_at: new Date("2026-02-20T09:00:00.000Z"),
    external_ref: "re_seed_001",
    reason: "Late check-in courtesy refund",
  },
];

// ─── Run ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding payment-service...");

  console.log(`  payments (captured): ${CAPTURED_PAYMENTS.length}`);
  for (const p of CAPTURED_PAYMENTS) {
    await db
      .insertInto("payments")
      .values(p)
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          status: eb.ref("excluded.status"),
          captured_at: eb.ref("excluded.captured_at"),
          stripe_payment_method_id: eb.ref("excluded.stripe_payment_method_id"),
          partner_id: eb.ref("excluded.partner_id"),
          property_id: eb.ref("excluded.property_id"),
          property_name: eb.ref("excluded.property_name"),
          gross_amount_usd: eb.ref("excluded.gross_amount_usd"),
          tax_amount_usd: eb.ref("excluded.tax_amount_usd"),
          partner_fee_usd: eb.ref("excluded.partner_fee_usd"),
          commission_rate: eb.ref("excluded.commission_rate"),
          commission_amount_usd: eb.ref("excluded.commission_amount_usd"),
          net_payout_usd: eb.ref("excluded.net_payout_usd"),
          fare_snapshot: eb.ref("excluded.fare_snapshot"),
        })),
      )
      .execute();
    console.log(
      `    ✓ ${p.id.slice(-4)}  ${p.property_name.padEnd(24)}  gross $${p.amount_usd}  net $${p.net_payout_usd}`,
    );
  }

  console.log(`  payments (pending): 1`);
  await db
    .insertInto("payments")
    .values(PENDING_PAYMENT)
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        status: eb.ref("excluded.status"),
        partner_id: eb.ref("excluded.partner_id"),
        property_id: eb.ref("excluded.property_id"),
        property_name: eb.ref("excluded.property_name"),
        gross_amount_usd: eb.ref("excluded.gross_amount_usd"),
        commission_amount_usd: eb.ref("excluded.commission_amount_usd"),
        net_payout_usd: eb.ref("excluded.net_payout_usd"),
        fare_snapshot: eb.ref("excluded.fare_snapshot"),
      })),
    )
    .execute();
  console.log(
    `    ✓ ${PENDING_PAYMENT.id.slice(-4)}  ${PENDING_PAYMENT.property_name}  status=pending  awaiting Stripe webhook`,
  );

  console.log(`  payment_adjustments: ${ADJUSTMENTS.length}`);
  for (const a of ADJUSTMENTS) {
    await db
      .insertInto("payment_adjustments")
      .values(a)
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          amount_usd: eb.ref("excluded.amount_usd"),
          reason: eb.ref("excluded.reason"),
        })),
      )
      .execute();
    console.log(
      `    ✓ ${a.kind} $${a.amount_usd}  → payment …${a.payment_id.slice(-4)}`,
    );
  }

  console.log("Seed complete.");
  await (db as unknown as { destroy: () => Promise<void> }).destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
