import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE partner_members (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL UNIQUE,
      role        TEXT NOT NULL DEFAULT 'manager',
      property_id TEXT NULL,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE INDEX ON partner_members (partner_id)`.execute(db);
  await sql`CREATE INDEX ON partner_members (property_id)`.execute(db);

  await sql`
    INSERT INTO partner_members (partner_id, user_id, role, property_id, status, created_at)
    SELECT partner_id, user_id, 'manager', property_id, status, created_at FROM managers
  `.execute(db);

  await sql`DROP TABLE managers`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE managers (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id  TEXT NOT NULL,
      property_id TEXT NOT NULL,
      user_id     TEXT NOT NULL UNIQUE,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE INDEX ON managers (partner_id)`.execute(db);
  await sql`CREATE INDEX ON managers (property_id)`.execute(db);
  await sql`
    INSERT INTO managers (partner_id, user_id, property_id, status, created_at)
    SELECT partner_id, user_id, property_id, status, created_at
    FROM partner_members WHERE role = 'manager'
  `.execute(db);
  await sql`DROP TABLE partner_members`.execute(db);
}
