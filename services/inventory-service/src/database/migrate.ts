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

export async function runMigrations(): Promise<void> {
  const logger = new Logger("Migrations");
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5434/travelhub",
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
      throw error instanceof Error
        ? error
        : new Error("Migration failed", { cause: error });
    logger.log("Migrations up to date");
  } finally {
    await pool.end();
  }
}
