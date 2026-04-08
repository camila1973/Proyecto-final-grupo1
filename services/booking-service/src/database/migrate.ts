import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Pool } from "pg";
import { Logger } from "@nestjs/common";

async function ensureDatabase(
  connectionString: string,
  logger: Logger,
): Promise<void> {
  const url = new URL(connectionString);
  const targetDb = url.pathname.slice(1);
  if (!targetDb || targetDb === "postgres") return;

  url.pathname = "/postgres";
  const adminPool = new Pool({
    connectionString: url.toString(),
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  try {
    const { rows } = await adminPool.query<{ exists: boolean }>(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb],
    );
    if (rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${targetDb}"`);
      logger.log(`Created database: ${targetDb}`);
    }
  } finally {
    await adminPool.end();
  }
}

export async function runMigrations(): Promise<void> {
  const logger = new Logger("Migrations");
  const connectionString =
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5436/travelhub";
  await ensureDatabase(connectionString, logger);
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });
  try {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, "migrations"),
      }),
    });
    const { error, results } = await migrator.migrateToLatest();
    for (const it of results ?? []) {
      if (it.status === "Success") {
        logger.log(`Applied migration: ${it.migrationName}`);
      } else if (it.status === "Error") {
        logger.error(`Failed migration: ${it.migrationName}`);
      }
    }
    if (error)
      throw error instanceof Error ? error : new Error("Migration failed");
    logger.log("Migrations up to date");
  } finally {
    await pool.end();
  }
}
