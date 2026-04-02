import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { SearchDatabase } from "./database.types.js";

export const KYSELY = "KYSELY";

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseProvider.name);
  private readonly pool: Pool;
  readonly db: Kysely<SearchDatabase>;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/search_service",
    });
    this.db = new Kysely<SearchDatabase>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  // Connectivity check only — schema is managed by migrations.
  // Run: nx migrate search-service
  async onModuleInit(): Promise<void> {
    await sql`SELECT 1`.execute(this.db);
    this.logger.log("Database connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
    await this.pool.end();
  }
}
