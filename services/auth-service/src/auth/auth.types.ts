export type UserRole = "guest" | "admin" | "partner" | "manager";

export type RegisterBody = {
  email: string;
  password: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  partnerId?: string;
  propertyId?: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type MfaLoginBody = {
  challengeId: string;
  code: string;
};

export type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  partnerId?: string;
  propertyId?: string;
};

export type RegisterResponse = PublicUser & {
  createdAt: string;
};

export type LoginResponse = {
  mfaRequired: true;
  challengeId: string;
  challengeType: "email_otp";
  expiresIn: 300;
  user: PublicUser;
};

export type LoginMfaResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: 3600;
  user: PublicUser;
};

export type UserListResponse = Array<
  PublicUser & { createdAt: string; lastLoginAt: string | null }
>;

export type DbUser = {
  id: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  partner_id: string | null;
  property_id: string | null;
  last_login_at: string | null;
};

export type DbChallenge = {
  id: string;
  user_id: string;
  otp_code_hash: string;
  attempts: number;
  expires_at: string;
};
