export type UserRole = "guest" | "admin" | "partner";

export type RegisterBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: UserRole;
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
  firstName: string;
  lastName: string;
};

export type RegisterResponse = PublicUser & {
  createdAt: string;
  mfa: {
    required: true;
    type: "totp";
    secret: string;
    otpauthUrl: string;
  };
};

export type LoginResponse = {
  mfaRequired: true;
  challengeId: string;
  challengeType: "totp";
  expiresIn: 300;
  user: PublicUser;
};

export type LoginMfaResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: 3600;
  user: PublicUser;
};

export type UserListResponse = Array<PublicUser & { createdAt: string }>;

export type DbUser = {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  password_hash: string;
  mfa_secret: string;
  created_at: string;
};

export type DbChallenge = {
  id: string;
  user_id: string;
  expires_at: string;
};
