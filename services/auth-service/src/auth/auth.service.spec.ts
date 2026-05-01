import { createHash, randomBytes, scryptSync } from "crypto";
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthRepository } from "./auth.repository";
import type { DbChallenge, DbUser } from "./auth.types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makePasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function makeOtpHash(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function makeRepo(): jest.Mocked<
  Pick<
    AuthRepository,
    | "findUserByEmail"
    | "findUserById"
    | "createUser"
    | "listUsers"
    | "createChallenge"
    | "findChallengeById"
    | "deleteChallengeById"
    | "incrementChallengeAttempts"
    | "purgeExpiredChallenges"
  >
> {
  return {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    listUsers: jest.fn(),
    createChallenge: jest.fn(),
    findChallengeById: jest.fn(),
    deleteChallengeById: jest.fn(),
    incrementChallengeAttempts: jest.fn(),
    purgeExpiredChallenges: jest.fn(),
  };
}

const DB_USER = (overrides: Partial<DbUser> = {}): DbUser => ({
  id: "usr_abc123",
  email: "user@example.com",
  role: "guest",
  password_hash: makePasswordHash("password123"),
  created_at: "2024-01-01T00:00:00.000Z",
  first_name: null,
  last_name: null,
  phone: null,
  partner_id: null,
  ...overrides,
});

const DB_CHALLENGE = (overrides: Partial<DbChallenge> = {}): DbChallenge => ({
  id: "mfa_challenge1",
  user_id: "usr_abc123",
  otp_code_hash: makeOtpHash("123456"),
  attempts: 0,
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  ...overrides,
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    repo.createUser.mockResolvedValue(undefined);
    repo.findUserByEmail.mockResolvedValue(null);
    repo.purgeExpiredChallenges.mockResolvedValue(undefined);
    repo.createChallenge.mockResolvedValue(undefined);
    repo.deleteChallengeById.mockResolvedValue(undefined);
    repo.incrementChallengeAttempts.mockResolvedValue(undefined);
    repo.listUsers.mockResolvedValue([]);
    service = new AuthService(repo as unknown as AuthRepository);
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe("register", () => {
    it("returns user info on success", async () => {
      const result = await service.register({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe("guest");
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.createdAt).toBeTruthy();
    });

    it("uses the provided role", async () => {
      const result = await service.register({
        email: "admin@example.com",
        password: "password123",
        role: "admin",
      });

      expect(result.role).toBe("admin");
    });

    it("normalizes email to lower-case and trims whitespace", async () => {
      const result = await service.register({
        email: "  TEST@EXAMPLE.COM  ",
        password: "password123",
      });

      expect(result.email).toBe("test@example.com");
      expect(repo.findUserByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("calls createUser with hashed password", async () => {
      await service.register({
        email: "test@example.com",
        password: "password123",
      });

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          role: "guest",
          passwordHash: expect.stringContaining(":"),
        }),
      );
    });

    it("throws ConflictException when email already registered", async () => {
      repo.findUserByEmail.mockResolvedValue(DB_USER());

      await expect(
        service.register({
          email: "user@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("throws BadRequestException for invalid email format", async () => {
      await expect(
        service.register({ email: "not-an-email", password: "password123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when email is empty", async () => {
      await expect(
        service.register({ email: "", password: "password123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for password shorter than 8 chars", async () => {
      await expect(
        service.register({ email: "test@example.com", password: "short" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when password is empty", async () => {
      await expect(
        service.register({ email: "test@example.com", password: "" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns MFA challenge on valid credentials", async () => {
      const password = "password123";
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash(password) }),
      );

      const result = await service.login({
        email: "user@example.com",
        password,
      });

      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.challengeType).toBe("email_otp");
      expect(result.expiresIn).toBe(300);
      expect(result.user.email).toBe("user@example.com");
    });

    it("normalizes email before lookup", async () => {
      const password = "password123";
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash(password) }),
      );

      await service.login({ email: "  USER@EXAMPLE.COM  ", password });

      expect(repo.findUserByEmail).toHaveBeenCalledWith("user@example.com");
    });

    it("throws UnauthorizedException when user not found", async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: "missing@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash("correct_password") }),
      );

      await expect(
        service.login({
          email: "user@example.com",
          password: "wrong_password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when stored hash has no salt (invalid format)", async () => {
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: "nocoloninthishash" }),
      );

      await expect(
        service.login({ email: "user@example.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws BadRequestException for invalid email", async () => {
      await expect(
        service.login({ email: "not-email", password: "password123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for short password", async () => {
      await expect(
        service.login({ email: "user@example.com", password: "short" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates a challenge and stores it", async () => {
      const password = "password123";
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash(password) }),
      );

      await service.login({ email: "user@example.com", password });

      expect(repo.createChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "usr_abc123",
          otpCodeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });

    it("does not throw when sendOtpEmail (fetch) fails", async () => {
      const password = "password123";
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash(password) }),
      );
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

      await expect(
        service.login({ email: "user@example.com", password }),
      ).resolves.not.toThrow();
    });

    it("purges expired challenges before creating a new one", async () => {
      const password = "password123";
      repo.findUserByEmail.mockResolvedValue(
        DB_USER({ password_hash: makePasswordHash(password) }),
      );

      await service.login({ email: "user@example.com", password });

      expect(repo.purgeExpiredChallenges).toHaveBeenCalled();
    });
  });

  // ─── verifyMfaLogin ──────────────────────────────────────────────────────────

  describe("verifyMfaLogin", () => {
    const OTP = "123456";
    const validChallenge = DB_CHALLENGE({ otp_code_hash: makeOtpHash(OTP) });
    const validUser = DB_USER();

    beforeEach(() => {
      repo.findChallengeById.mockResolvedValue(validChallenge);
      repo.findUserById.mockResolvedValue(validUser);
    });

    it("throws BadRequestException when challengeId is empty", async () => {
      await expect(
        service.verifyMfaLogin({ challengeId: "", code: OTP }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when code is empty", async () => {
      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_challenge1", code: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws UnauthorizedException when challenge not found", async () => {
      repo.findChallengeById.mockResolvedValue(null);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_none", code: OTP }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException and deletes challenge when expired", async () => {
      repo.findChallengeById.mockResolvedValue(
        DB_CHALLENGE({ expires_at: new Date(Date.now() - 1000).toISOString() }),
      );

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_challenge1", code: OTP }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_challenge1");
    });

    it("throws UnauthorizedException and deletes challenge when attempts >= 3", async () => {
      repo.findChallengeById.mockResolvedValue(DB_CHALLENGE({ attempts: 3 }));

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_challenge1", code: OTP }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_challenge1");
    });

    it("throws UnauthorizedException and deletes challenge when user not found", async () => {
      repo.findUserById.mockResolvedValue(null);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_challenge1", code: OTP }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_challenge1");
    });

    it("returns access token on valid OTP", async () => {
      const result = await service.verifyMfaLogin({
        challengeId: "mfa_challenge1",
        code: OTP,
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.accessToken.split(".")).toHaveLength(3);
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresIn).toBe(3600);
      expect(result.user.id).toBe("usr_abc123");
    });

    it("trims whitespace from code before verifying", async () => {
      const result = await service.verifyMfaLogin({
        challengeId: "mfa_challenge1",
        code: `  ${OTP}  `,
      });

      expect(result.accessToken).toBeTruthy();
    });

    it("deletes challenge after successful verification", async () => {
      await service.verifyMfaLogin({
        challengeId: "mfa_challenge1",
        code: OTP,
      });

      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_challenge1");
    });

    it("increments attempts and throws on wrong code", async () => {
      await expect(
        service.verifyMfaLogin({
          challengeId: "mfa_challenge1",
          code: "000000",
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.incrementChallengeAttempts).toHaveBeenCalledWith(
        "mfa_challenge1",
      );
    });

    it("deletes challenge and throws when wrong code reaches 3 attempts", async () => {
      repo.findChallengeById.mockResolvedValue(
        DB_CHALLENGE({ attempts: 2, otp_code_hash: makeOtpHash(OTP) }),
      );

      await expect(
        service.verifyMfaLogin({
          challengeId: "mfa_challenge1",
          code: "000000",
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_challenge1");
    });
  });

  // ─── registerInternal ────────────────────────────────────────────────────────

  describe("registerInternal", () => {
    it("returns a challengeId on success", async () => {
      const result = await service.registerInternal({
        email: "partner@example.com",
        password: "password123",
        role: "partner",
        partnerId: "partner-uuid-1",
      });

      expect(result.challengeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("creates the user with the given partnerId", async () => {
      await service.registerInternal({
        email: "partner@example.com",
        password: "password123",
        role: "partner",
        partnerId: "partner-uuid-1",
      });

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "partner@example.com",
          role: "partner",
          partnerId: "partner-uuid-1",
        }),
      );
    });

    it("creates a challenge after creating the user", async () => {
      await service.registerInternal({
        email: "partner@example.com",
        password: "password123",
      });

      expect(repo.createChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          otpCodeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });

    it("throws ConflictException when email is already registered", async () => {
      repo.findUserByEmail.mockResolvedValue(DB_USER());

      await expect(
        service.registerInternal({
          email: "user@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("throws BadRequestException for invalid email", async () => {
      await expect(
        service.registerInternal({
          email: "not-email",
          password: "password123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for short password", async () => {
      await expect(
        service.registerInternal({ email: "p@example.com", password: "short" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("does not throw when sendOtpEmail (fetch) fails", async () => {
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

      await expect(
        service.registerInternal({
          email: "partner@example.com",
          password: "password123",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── partnerId in JWT ─────────────────────────────────────────────────────────

  describe("verifyMfaLogin — partnerId in JWT", () => {
    const OTP = "123456";

    it("includes partnerId in the access token when user has a partner_id", async () => {
      repo.findChallengeById.mockResolvedValue(
        DB_CHALLENGE({ otp_code_hash: makeOtpHash(OTP) }),
      );
      repo.findUserById.mockResolvedValue(
        DB_USER({ partner_id: "partner-uuid-1" }),
      );

      const result = await service.verifyMfaLogin({
        challengeId: "mfa_challenge1",
        code: OTP,
      });

      expect(result.user.partnerId).toBe("partner-uuid-1");

      // Decode JWT payload to confirm claim is present
      const payloadB64 = result.accessToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      expect(payload.partnerId).toBe("partner-uuid-1");
    });

    it("omits partnerId from JWT when user has no partner_id", async () => {
      repo.findChallengeById.mockResolvedValue(
        DB_CHALLENGE({ otp_code_hash: makeOtpHash(OTP) }),
      );
      repo.findUserById.mockResolvedValue(DB_USER({ partner_id: null }));

      const result = await service.verifyMfaLogin({
        challengeId: "mfa_challenge1",
        code: OTP,
      });

      expect(result.user.partnerId).toBeUndefined();

      const payloadB64 = result.accessToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      expect(payload.partnerId).toBeUndefined();
    });
  });

  // ─── getUsers ────────────────────────────────────────────────────────────────

  describe("getUsers", () => {
    it("returns mapped user list with camelCase createdAt", async () => {
      repo.listUsers.mockResolvedValue([
        {
          id: "usr_1",
          email: "a@b.com",
          role: "guest",
          password_hash: "h",
          created_at: "2024-01-01",
          first_name: null,
          last_name: null,
          phone: null,
          partner_id: null,
        },
        {
          id: "usr_2",
          email: "c@d.com",
          role: "admin",
          password_hash: "h2",
          created_at: "2024-02-01",
          first_name: null,
          last_name: null,
          phone: null,
          partner_id: null,
        },
      ]);

      const result = await service.getUsers();

      expect(result).toEqual([
        {
          id: "usr_1",
          email: "a@b.com",
          role: "guest",
          createdAt: "2024-01-01",
        },
        {
          id: "usr_2",
          email: "c@d.com",
          role: "admin",
          createdAt: "2024-02-01",
        },
      ]);
    });

    it("returns empty array when no users exist", async () => {
      repo.listUsers.mockResolvedValue([]);

      const result = await service.getUsers();

      expect(result).toEqual([]);
    });
  });
});
