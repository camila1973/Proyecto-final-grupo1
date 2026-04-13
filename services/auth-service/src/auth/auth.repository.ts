import { Inject, Injectable } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import type { AuthDatabase } from "../database/database.types";
import { KYSELY } from "../database/database.provider";
import type { DbChallenge, DbUser, UserRole } from "./auth.types";

@Injectable()
export class AuthRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<AuthDatabase>) {}

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
}
