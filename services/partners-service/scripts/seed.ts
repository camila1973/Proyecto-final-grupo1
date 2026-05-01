import { Pool } from "pg";

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const PROP_KEYS: Array<{ partnerId: string; propertyId: string; key: string }> =
  [
    {
      partnerId: PARTNER_1,
      propertyId: PROP_CANCUN_1,
      key: "checkin-key-prop-cancun-1",
    },
    {
      partnerId: PARTNER_1,
      propertyId: PROP_CANCUN_2,
      key: "checkin-key-prop-cancun-2",
    },
    {
      partnerId: PARTNER_2,
      propertyId: PROP_CANCUN_3,
      key: "checkin-key-prop-cancun-3",
    },
    {
      partnerId: PARTNER_2,
      propertyId: PROP_CDMX_1,
      key: "checkin-key-prop-cdmx-1",
    },
    {
      partnerId: PARTNER_2,
      propertyId: PROP_CDMX_2,
      key: "checkin-key-prop-cdmx-2",
    },
  ];

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5438/partners_service",
  });

  const client = await pool.connect();
  try {
    console.log("Clearing tables...");
    await client.query(
      "TRUNCATE partners, property_check_in_keys RESTART IDENTITY CASCADE",
    );

    console.log("Seeding partners...");
    await client.query(`
      INSERT INTO partners (id, name, slug)
      VALUES
        ('${PARTNER_1}', 'Gran Caribe Hospitality Group', 'gran-caribe-hospitality'),
        ('${PARTNER_2}', 'Sol Boutique Hotels & Hostales', 'sol-boutique-hotels')
    `);

    console.log("Seeding property_check_in_keys...");
    for (const { partnerId, propertyId, key } of PROP_KEYS) {
      await client.query(
        `INSERT INTO property_check_in_keys (partner_id, property_id, check_in_key)
         VALUES ($1, $2, $3)`,
        [partnerId, propertyId, key],
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
