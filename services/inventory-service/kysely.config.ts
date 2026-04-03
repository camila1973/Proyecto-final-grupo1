import { defineConfig } from "kysely-ctl";
import { Pool } from "pg";
import { PostgresDialect } from "kysely";

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5434/travelhub",
    }),
  }),
  migrations: {
    migrationFolder: "src/database/migrations",
  },
});
