import { Pool } from "pg";

// ─── Shared UUIDs — must match inventory-service/scripts/seed.ts ──────────────

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── External IDs — partner-facing identifiers used in webhooks/CSVs ──────────

const EXT_PROPS: Array<{
  partnerId: string;
  externalId: string;
  internalId: string;
}> = [
  {
    partnerId: PARTNER_1,
    externalId: "gran-caribe-resort",
    internalId: PROP_CANCUN_1,
  },
  {
    partnerId: PARTNER_1,
    externalId: "playa-azul-hotel",
    internalId: PROP_CANCUN_2,
  },
  {
    partnerId: PARTNER_2,
    externalId: "hostal-sol-cancun",
    internalId: PROP_CANCUN_3,
  },
  {
    partnerId: PARTNER_2,
    externalId: "hotel-historico-centro",
    internalId: PROP_CDMX_1,
  },
  { partnerId: PARTNER_2, externalId: "condesa-inn", internalId: PROP_CDMX_2 },
];

const EXT_ROOMS: Array<{
  partnerId: string;
  externalId: string;
  internalId: string;
}> = [
  // Gran Caribe Resort & Spa (PARTNER_1)
  {
    partnerId: PARTNER_1,
    externalId: "gran-caribe-deluxe-king-ocean",
    internalId: ROOM(1),
  },
  {
    partnerId: PARTNER_1,
    externalId: "gran-caribe-suite-king-ocean",
    internalId: ROOM(2),
  },
  // Playa Azul Hotel (PARTNER_1)
  {
    partnerId: PARTNER_1,
    externalId: "playa-azul-standard-queen-pool",
    internalId: ROOM(3),
  },
  {
    partnerId: PARTNER_1,
    externalId: "playa-azul-deluxe-king-ocean",
    internalId: ROOM(4),
  },
  {
    partnerId: PARTNER_1,
    externalId: "playa-azul-junior-suite-king-ocean",
    internalId: ROOM(5),
  },
  // Hostal Sol Cancún (PARTNER_2)
  {
    partnerId: PARTNER_2,
    externalId: "hostal-sol-standard-double-city",
    internalId: ROOM(6),
  },
  {
    partnerId: PARTNER_2,
    externalId: "hostal-sol-standard-twin-garden",
    internalId: ROOM(7),
  },
  // Hotel Histórico Centro (PARTNER_2)
  {
    partnerId: PARTNER_2,
    externalId: "historico-deluxe-king-city",
    internalId: ROOM(8),
  },
  {
    partnerId: PARTNER_2,
    externalId: "historico-penthouse-king-city",
    internalId: ROOM(9),
  },
  // Condesa Inn (PARTNER_2)
  {
    partnerId: PARTNER_2,
    externalId: "condesa-standard-queen-garden",
    internalId: ROOM(10),
  },
];

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      process.env.INTEGRATION_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5435/integration_service",
  });

  const client = await pool.connect();
  try {
    // ── Truncate ──────────────────────────────────────────────────────────────
    console.log("Clearing tables...");
    await client.query(
      "TRUNCATE external_id_map, pms_registrations RESTART IDENTITY CASCADE",
    );

    // ── PMS registrations ────────────────────────────────────────────────────
    console.log("Seeding pms_registrations...");
    await client.query(`
      INSERT INTO pms_registrations (partner_id, name, adapter_type, signing_secret, enabled)
      VALUES
        ('${PARTNER_1}', 'Partner 1 (Cancún properties)', 'generic', 'secret-partner-1', true),
        ('${PARTNER_2}', 'Partner 2 (CDMX + Cancún hostel)', 'generic', 'secret-partner-2', true)
    `);

    // ── External ID map — properties ─────────────────────────────────────────
    console.log("Seeding external_id_map (properties)...");
    for (const { partnerId, externalId, internalId } of EXT_PROPS) {
      await client.query(
        `INSERT INTO external_id_map (partner_id, entity_type, external_id, internal_id)
         VALUES ($1, 'property', $2, $3)`,
        [partnerId, externalId, internalId],
      );
    }

    // ── External ID map — rooms ───────────────────────────────────────────────
    console.log("Seeding external_id_map (rooms)...");
    for (const { partnerId, externalId, internalId } of EXT_ROOMS) {
      await client.query(
        `INSERT INTO external_id_map (partner_id, entity_type, external_id, internal_id)
         VALUES ($1, 'room', $2, $3)`,
        [partnerId, externalId, internalId],
      );
    }

    console.log("✓ Seed complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

void seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
