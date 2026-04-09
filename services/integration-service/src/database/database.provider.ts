import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { Database } from "./database.types";

export const KYSELY = "KYSELY";

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseProvider.name);
  private pool: Pool;
  readonly db: Kysely<Database>;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5435/integration_service";
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: this.pool }),
      plugins: [new CamelCasePlugin()],
    });
  }

  async onModuleInit(): Promise<void> {
    await sql`SELECT 1`.execute(this.db);
    this.logger.log("Database connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
