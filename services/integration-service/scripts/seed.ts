import { Pool } from "pg";

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      process.env.INTEGRATION_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5435/integration_service",
  });

  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO pms_registrations (partner_id, name, adapter_type, signing_secret, enabled)
      VALUES
        ('partner-seed-1', 'Demo Generic Partner', 'generic', 'demo-secret-1', true),
        ('partner-seed-2', 'Demo Hotelbeds Partner', 'hotelbeds', 'demo-secret-2', true)
      ON CONFLICT DO NOTHING
    `);
    console.log("Seed completed");
  } finally {
    client.release();
    await pool.end();
  }
}

void seed().catch(console.error);
