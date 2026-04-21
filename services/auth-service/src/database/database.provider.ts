import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { AuthDatabase } from "./database.types";

export const KYSELY = "KYSELY";

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseProvider.name);
  private readonly pool: Pool;
  readonly db: Kysely<AuthDatabase>;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/travelhub";
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
    this.db = new Kysely<AuthDatabase>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  // Connectivity check only — schema is managed by migrations.
  // Run: nx migrate auth-service
  async onModuleInit(): Promise<void> {
    await sql`SELECT 1`.execute(this.db);
    this.logger.log("Database connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
    await this.pool.end();
  }
}
