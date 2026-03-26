import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type {
  LoginBody,
  LoginMfaResponse,
  LoginResponse,
  MfaLoginBody,
  PublicUser,
  RegisterBody,
  RegisterResponse,
  UserListResponse,
} from "./auth.types";
import { AuthRepository } from "./auth.repository";

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.AUTH_JWT_SECRET ?? "travelhub-dev-jwt-secret-change-me";
  private readonly jwtIssuer = "travelhub-auth-service";
  private readonly mfaIssuer = "TravelHub";

  constructor(private readonly authRepository: AuthRepository) {}

  async register(body: RegisterBody): Promise<RegisterResponse> {
    this.validateRegistrationFields(body);

    const normalizedEmail = body.email.trim().toLowerCase();
    const existingUser =
      await this.authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const userId = this.generateId("usr");
    const mfaSecret = this.generateBase32Secret();
    const createdAt = new Date().toISOString();

    await this.authRepository.createUser({
      id: userId,
      email: normalizedEmail,
      role: body.role ?? "guest",
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      passwordHash: this.hashPassword(body.password),
      mfaSecret,
      createdAt,
    });

    return {
      id: userId,
      email: normalizedEmail,
      role: body.role ?? "guest",
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      createdAt,
      mfa: {
        required: true,
        type: "totp",
        secret: mfaSecret,
        otpauthUrl: this.getOtpAuthUrl(normalizedEmail, mfaSecret),
      },
    };
  }

  async login(body: LoginBody): Promise<LoginResponse> {
    this.validateEmailAndPassword(body.email, body.password);

    const normalizedEmail = body.email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!user || !this.verifyPassword(body.password, user.password_hash)) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.authRepository.purgeExpiredChallenges();

    const challengeId = this.generateId("mfa");
    await this.authRepository.createChallenge({
      id: challengeId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    return {
      mfaRequired: true,
      challengeId,
      challengeType: "totp",
      expiresIn: 300,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    };
  }

  async verifyMfaLogin(body: MfaLoginBody): Promise<LoginMfaResponse> {
    if (!body.challengeId || !body.code) {
      throw new BadRequestException("challengeId and code are required");
    }

    const challenge = await this.authRepository.findChallengeById(
      body.challengeId,
    );
    if (!challenge) {
      throw new UnauthorizedException("Invalid login challenge");
    }

    if (Date.now() > new Date(challenge.expires_at).getTime()) {
      await this.authRepository.deleteChallengeById(challenge.id);
      throw new UnauthorizedException("Login challenge expired");
    }

    const user = await this.authRepository.findUserById(challenge.user_id);
    if (!user) {
      await this.authRepository.deleteChallengeById(challenge.id);
      throw new UnauthorizedException("Invalid login challenge");
    }

    const isCodeValid = this.verifyTotpCode(user.mfa_secret, body.code);
    if (!isCodeValid) {
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.authRepository.deleteChallengeById(challenge.id);

    return {
      accessToken: this.createAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      }),
      tokenType: "Bearer",
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    };
  }

  async getUsers(): Promise<UserListResponse> {
    const users = await this.authRepository.listUsers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
    }));
  }

  private createAccessToken(user: PublicUser): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mfa: true,
      iss: this.jwtIssuer,
      iat: now,
      exp: now + 3600,
    };
    return this.signJwt(payload);
  }

  private signJwt(payload: Record<string, unknown>): string {
    const headerPart = this.base64UrlEncode(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    );
    const payloadPart = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${headerPart}.${payloadPart}`;
    const signature = createHmac("sha256", this.jwtSecret)
      .update(unsignedToken)
      .digest("base64url");
    return `${unsignedToken}.${signature}`;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, existingHash] = storedHash.split(":");
    if (!salt || !existingHash) {
      return false;
    }
    const computedHash = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(
      Buffer.from(existingHash, "hex"),
      Buffer.from(computedHash, "hex"),
    );
  }

  private validateRegistrationFields(body: RegisterBody): void {
    if (!body.firstName?.trim()) {
      throw new BadRequestException("First name is required");
    }

    if (!body.lastName?.trim()) {
      throw new BadRequestException("Last name is required");
    }

    this.validateEmailAndPassword(body.email, body.password);

    if (
      body.confirmPassword !== undefined &&
      body.confirmPassword !== body.password
    ) {
      throw new BadRequestException("Passwords do not match");
    }
  }

  private validateEmailAndPassword(email: string, password: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email?.trim())) {
      throw new BadRequestException("Invalid email format");
    }

    if (!password || password.length < 8) {
      throw new BadRequestException("Password must have at least 8 characters");
    }

    if (password.length > 16) {
      throw new BadRequestException("Password must not exceed 16 characters");
    }

    if (!/[a-zA-Z]/.test(password)) {
      throw new BadRequestException(
        "Password must contain at least one letter",
      );
    }

    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        "Password must contain at least one number",
      );
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      throw new BadRequestException(
        "Password must contain at least one special character",
      );
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${randomBytes(8).toString("hex")}`;
  }

  private getOtpAuthUrl(email: string, secret: string): string {
    const label = encodeURIComponent(`${this.mfaIssuer}:${email}`);
    const issuer = encodeURIComponent(this.mfaIssuer);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  private generateBase32Secret(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = randomBytes(20);
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private verifyTotpCode(secret: string, code: string): boolean {
    const sanitizedCode = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(sanitizedCode)) {
      return false;
    }

    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    for (let offset = -1; offset <= 1; offset++) {
      const expectedCode = this.generateTotpCode(
        secret,
        currentCounter + offset,
      );
      if (
        timingSafeEqual(Buffer.from(expectedCode), Buffer.from(sanitizedCode))
      ) {
        return true;
      }
    }
    return false;
  }

  private generateTotpCode(secret: string, counter: number): string {
    const key = this.decodeBase32(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac("sha1", key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binaryCode =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (binaryCode % 1_000_000).toString().padStart(6, "0");
  }

  private decodeBase32(secret: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const normalized = secret.replace(/=+$/g, "").toUpperCase();

    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of normalized) {
      const index = alphabet.indexOf(char);
      if (index === -1) {
        throw new BadRequestException("Invalid MFA secret");
      }
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  private base64UrlEncode(input: string): string {
    return Buffer.from(input)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
}
