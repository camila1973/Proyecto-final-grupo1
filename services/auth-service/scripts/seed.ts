import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { randomBytes, scryptSync } from "crypto";
import type { AuthDatabase } from "../src/database/database.types.js";

const db = new Kysely<AuthDatabase>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/travelhub",
    }),
  }),
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ─── seed data ────────────────────────────────────────────────────────────────

// UUIDs must match booking-service/scripts/seed.ts BOOKER() values
const USERS = [
  {
    id: "e1000000-0000-0000-0000-000000000001",
    email: "admin@travelhub.com",
    role: "admin" as const,
    password: "Admin1234!",
    firstName: "Admin",
    lastName: "TravelHub",
  },
  {
    id: "e1000000-0000-0000-0000-000000000002",
    email: "partner@travelhub.com",
    role: "partner" as const,
    password: "Partner1234!",
    firstName: "Partner",
    lastName: "TravelHub",
  },
  {
    id: "e1000000-0000-0000-0000-000000000003",
    email: "guest@travelhub.com",
    role: "guest" as const,
    password: "Guest1234!",
    firstName: "Guest",
    lastName: "TravelHub",
  },
];

// ─── seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Truncating tables...");
  await sql`TRUNCATE auth_login_challenges, auth_users RESTART IDENTITY CASCADE`.execute(
    db,
  );

  console.log("Seeding auth_users...");
  await db
    .insertInto("auth_users")
    .values(
      USERS.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        password_hash: hashPassword(u.password),
        created_at: new Date().toISOString(),
        first_name: u.firstName,
        last_name: u.lastName,
        phone: null,
      })),
    )
    .execute();

  for (const u of USERS) {
    console.log(
      `  ✓ ${u.role.padEnd(7)} ${u.email}  (password: ${u.password})`,
    );
  }

  console.log("✓ Seed complete.");
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
