import type { Generated } from "kysely";
import type { UserRole } from "../auth/auth.types";

export type AuthUsersTable = {
  id: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created_at: Generated<string>;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export type AuthLoginChallengesTable = {
  id: string;
  user_id: string;
  otp_code_hash: string;
  attempts: Generated<number>;
  expires_at: string;
  created_at: Generated<string>;
};

export type AuthDatabase = {
  auth_users: AuthUsersTable;
  auth_login_challenges: AuthLoginChallengesTable;
};
