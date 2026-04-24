import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "crypto";
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
  private readonly notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3006";

  constructor(private readonly authRepository: AuthRepository) {}

  async register(body: RegisterBody): Promise<RegisterResponse> {
    this.validateEmailAndPassword(body.email, body.password);

    const normalizedEmail = body.email.trim().toLowerCase();
    const existingUser =
      await this.authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const userId = randomUUID();
    const createdAt = new Date().toISOString();

    await this.authRepository.createUser({
      id: userId,
      email: normalizedEmail,
      role: body.role ?? "guest",
      passwordHash: this.hashPassword(body.password),
      createdAt,
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
    });

    return {
      id: userId,
      email: normalizedEmail,
      role: body.role ?? "guest",
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      createdAt,
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

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const challengeId = randomUUID();

    await this.authRepository.createChallenge({
      id: challengeId,
      userId: user.id,
      otpCodeHash: otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    await this.sendOtpEmail(user.email, user.id, otp);

    return {
      mfaRequired: true,
      challengeId,
      challengeType: "email_otp",
      expiresIn: 300,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        phone: user.phone ?? undefined,
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

    if (challenge.attempts >= 3) {
      await this.authRepository.deleteChallengeById(challenge.id);
      throw new UnauthorizedException(
        "Too many failed attempts, please login again",
      );
    }

    const user = await this.authRepository.findUserById(challenge.user_id);
    if (!user) {
      await this.authRepository.deleteChallengeById(challenge.id);
      throw new UnauthorizedException("Invalid login challenge");
    }

    const submittedHash = this.hashOtp(body.code.trim());
    const isCodeValid = timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(challenge.otp_code_hash, "hex"),
    );

    if (!isCodeValid) {
      const newAttempts = challenge.attempts + 1;
      if (newAttempts >= 3) {
        await this.authRepository.deleteChallengeById(challenge.id);
        throw new UnauthorizedException(
          "Too many failed attempts, please login again",
        );
      }
      await this.authRepository.incrementChallengeAttempts(challenge.id);
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.authRepository.deleteChallengeById(challenge.id);

    return {
      accessToken: this.createAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      tokenType: "Bearer",
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        phone: user.phone ?? undefined,
      },
    };
  }

  async getUsers(): Promise<UserListResponse> {
    const users = await this.authRepository.listUsers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name ?? undefined,
      lastName: user.last_name ?? undefined,
      phone: user.phone ?? undefined,
      createdAt: user.created_at,
    }));
  }

  private generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex");
  }

  private async sendOtpEmail(
    email: string,
    userId: string,
    otp: string,
  ): Promise<void> {
    try {
      await fetch(`${this.notificationServiceUrl}/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          userId,
          channel: "email",
          subject: "Your TravelHub verification code",
          message: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes.`,
        }),
      });
    } catch {
      // Non-blocking: log but don't fail the login flow
      console.error("Failed to send OTP email");
    }
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

  private validateEmailAndPassword(email: string, password: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email?.trim())) {
      throw new BadRequestException("Invalid email format");
    }

    if (!password || password.length < 8) {
      throw new BadRequestException("Password must have at least 8 characters");
    }
  }

  private base64UrlEncode(input: string): string {
    return Buffer.from(input)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
}
