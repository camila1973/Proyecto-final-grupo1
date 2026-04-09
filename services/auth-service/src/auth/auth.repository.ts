import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Generated, Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { DbChallenge, DbUser, UserRole } from "./auth.types";

type AuthUsersTable = {
  id: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created_at: string;
};

type AuthLoginChallengesTable = {
  id: string;
  user_id: string;
  otp_code_hash: string;
  attempts: Generated<number>;
  expires_at: string;
  created_at: Generated<string>;
};

type AuthDatabase = {
  auth_users: AuthUsersTable;
  auth_login_challenges: AuthLoginChallengesTable;
};

@Injectable()
export class AuthRepository implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly db: Kysely<AuthDatabase>;

  private readonly connectionString: string;

  constructor() {
    this.connectionString =
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/travelhub";
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: this.connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
    this.db = new Kysely<AuthDatabase>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDatabase();
    await this.initializeSchema();
  }

  private async ensureDatabase(): Promise<void> {
    const url = new URL(this.connectionString);
    const targetDb = url.pathname.slice(1);
    if (!targetDb || targetDb === "postgres") return;
    url.pathname = "/postgres";
    const adminPool = new Pool({
      connectionString: url.toString(),
      ssl: this.connectionString.includes("localhost")
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
      }
    } finally {
      await adminPool.end();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
    await this.pool.end();
  }

  async createUser(params: {
    id: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    createdAt: string;
  }): Promise<void> {
    await this.db
      .insertInto("auth_users")
      .values({
        id: params.id,
        email: params.email,
        role: params.role,
        password_hash: params.passwordHash,
        created_at: params.createdAt,
      })
      .executeTakeFirstOrThrow();
  }

  async findUserByEmail(email: string): Promise<DbUser | null> {
    const row = await this.db
      .selectFrom("auth_users")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();
    return row ?? null;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const row = await this.db
      .selectFrom("auth_users")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  }

  async listUsers(): Promise<DbUser[]> {
    return this.db
      .selectFrom("auth_users")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
  }

  async createChallenge(params: {
    id: string;
    userId: string;
    otpCodeHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.db
      .insertInto("auth_login_challenges")
      .values({
        id: params.id,
        user_id: params.userId,
        otp_code_hash: params.otpCodeHash,
        expires_at: params.expiresAt,
      })
      .executeTakeFirstOrThrow();
  }

  async findChallengeById(id: string): Promise<DbChallenge | null> {
    const row = await this.db
      .selectFrom("auth_login_challenges")
      .select(["id", "user_id", "otp_code_hash", "attempts", "expires_at"])
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
  }

  async incrementChallengeAttempts(id: string): Promise<void> {
    await this.db
      .updateTable("auth_login_challenges")
      .set((eb) => ({ attempts: eb("attempts", "+", 1) }))
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async deleteChallengeById(id: string): Promise<void> {
    await this.db
      .deleteFrom("auth_login_challenges")
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async purgeExpiredChallenges(): Promise<void> {
    await sql`
      DELETE FROM auth_login_challenges
      WHERE expires_at < NOW()
    `.execute(this.db);
  }

  private async initializeSchema(): Promise<void> {
    try {
      await this.db.schema
        .createTable("auth_users")
        .ifNotExists()
        .addColumn("id", "text", (column) => column.primaryKey())
        .addColumn("email", "text", (column) => column.notNull().unique())
        .addColumn("role", "text", (column) => column.notNull())
        .addColumn("password_hash", "text", (column) => column.notNull())
        .addColumn("created_at", "timestamptz", (column) => column.notNull())
        .execute();

      // Drop mfa_secret if it exists (leftover from TOTP implementation)
      await sql`
        ALTER TABLE auth_users DROP COLUMN IF EXISTS mfa_secret
      `.execute(this.db);

      await this.db.schema
        .createTable("auth_login_challenges")
        .ifNotExists()
        .addColumn("id", "text", (column) => column.primaryKey())
        .addColumn("user_id", "text", (column) => column.notNull())
        .addColumn("otp_code_hash", "text", (column) => column.notNull())
        .addColumn("attempts", "integer", (column) =>
          column.notNull().defaultTo(0),
        )
        .addColumn("expires_at", "timestamptz", (column) => column.notNull())
        .addColumn("created_at", "timestamptz", (column) =>
          column.notNull().defaultTo(sql`NOW()`),
        )
        .addForeignKeyConstraint(
          "auth_login_challenges_user_id_fkey",
          ["user_id"],
          "auth_users",
          ["id"],
          (constraint) => constraint.onDelete("cascade"),
        )
        .execute();

      // Add otp_code_hash and attempts if the table existed without them
      await sql`
        ALTER TABLE auth_login_challenges
          ADD COLUMN IF NOT EXISTS otp_code_hash text,
          ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0
      `.execute(this.db);

      await this.db.schema
        .createIndex("idx_auth_login_challenges_expires_at")
        .ifNotExists()
        .on("auth_login_challenges")
        .column("expires_at")
        .execute();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to initialize auth schema: ${String(error)}`,
      );
    }
  }
}
