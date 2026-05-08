export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  mfa: boolean;
  iss: string;
  iat: number;
  exp: number;
  partnerId?: string;
  propertyId?: string;
}

export class MissingTokenError extends Error {
  constructor(message = "Missing or non-Bearer Authorization header") {
    super(message);
    this.name = "MissingTokenError";
  }
}
