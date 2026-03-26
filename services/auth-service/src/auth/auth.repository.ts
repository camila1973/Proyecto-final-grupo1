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
  first_name: string;
  last_name: string;
  password_hash: string;
  mfa_secret: string;
  created_at: string;
};

type AuthLoginChallengesTable = {
  id: string;
  user_id: string;
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

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/travelhub",
    });
    this.db = new Kysely<AuthDatabase>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initializeSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
    await this.pool.end();
  }

  async createUser(params: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    passwordHash: string;
    mfaSecret: string;
    createdAt: string;
  }): Promise<void> {
    await this.db
      .insertInto("auth_users")
      .values({
        id: params.id,
        email: params.email,
        role: params.role,
        first_name: params.firstName,
        last_name: params.lastName,
        password_hash: params.passwordHash,
        mfa_secret: params.mfaSecret,
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
    expiresAt: string;
  }): Promise<void> {
    await this.db
      .insertInto("auth_login_challenges")
      .values({
        id: params.id,
        user_id: params.userId,
        expires_at: params.expiresAt,
      })
      .executeTakeFirstOrThrow();
  }

  async findChallengeById(id: string): Promise<DbChallenge | null> {
    const row = await this.db
      .selectFrom("auth_login_challenges")
      .select(["id", "user_id", "expires_at"])
      .where("id", "=", id)
      .executeTakeFirst();
    return row ?? null;
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
        .addColumn("first_name", "text", (column) =>
          column.notNull().defaultTo(""),
        )
        .addColumn("last_name", "text", (column) =>
          column.notNull().defaultTo(""),
        )
        .addColumn("password_hash", "text", (column) => column.notNull())
        .addColumn("mfa_secret", "text", (column) => column.notNull())
        .addColumn("created_at", "timestamptz", (column) => column.notNull())
        .execute();

      await this.db.schema
        .createTable("auth_login_challenges")
        .ifNotExists()
        .addColumn("id", "text", (column) => column.primaryKey())
        .addColumn("user_id", "text", (column) => column.notNull())
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
