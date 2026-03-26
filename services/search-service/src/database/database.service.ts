import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { SearchDatabase } from "./database.types.js";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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

  async onModuleInit(): Promise<void> {
    // Connectivity check — migrations are applied externally via kysely-ctl
    // before the app starts: `nx migrate search-service`
    await sql`SELECT 1`.execute(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
    await this.pool.end();
  }
}
