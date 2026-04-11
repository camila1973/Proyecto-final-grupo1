import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthRepository } from "./auth.repository";
import type { DbChallenge, DbUser } from "./auth.types";

type AuthServicePrivate = {
  hashPassword(password: string): string;
  hashOtp(otp: string): string;
};

type RepoMock = jest.Mocked<
  Pick<
    AuthRepository,
    | "findUserByEmail"
    | "createUser"
    | "purgeExpiredChallenges"
    | "createChallenge"
    | "findChallengeById"
    | "findUserById"
    | "deleteChallengeById"
    | "incrementChallengeAttempts"
    | "listUsers"
  >
>;

function makeRepo(): RepoMock {
  return {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    purgeExpiredChallenges: jest.fn(),
    createChallenge: jest.fn(),
    findChallengeById: jest.fn(),
    findUserById: jest.fn(),
    deleteChallengeById: jest.fn(),
    incrementChallengeAttempts: jest.fn(),
    listUsers: jest.fn(),
  } as RepoMock;
}

function makeDbUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: "usr_1",
    email: "user@example.com",
    role: "guest",
    password_hash: "",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeChallenge(overrides: Partial<DbChallenge> = {}): DbChallenge {
  return {
    id: "mfa_1",
    user_id: "usr_1",
    otp_code_hash: "",
    attempts: 0,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

describe("AuthService", () => {
  let repo: RepoMock;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepo();
    service = new AuthService(repo as unknown as AuthRepository);
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("register", () => {
    it("throws for invalid email", async () => {
      await expect(
        service.register({ email: "bad-email", password: "Password@1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws when email already exists", async () => {
      repo.findUserByEmail.mockResolvedValue(makeDbUser());

      await expect(
        service.register({ email: "user@example.com", password: "Password@1" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates user with normalized email and default role", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(undefined);

      const result = await service.register({
        email: " USER@EXAMPLE.COM ",
        password: "Password@1",
      });

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          role: "guest",
        }),
      );
      expect(result.email).toBe("user@example.com");
      expect(result.role).toBe("guest");
      expect(result.id).toMatch(/^usr_/);
    });
  });

  describe("login", () => {
    it("throws for invalid credentials", async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: "user@example.com", password: "Password@1" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("creates MFA challenge and returns response", async () => {
      const passwordHash = (
        service as unknown as AuthServicePrivate
      ).hashPassword("Password@1");
      repo.findUserByEmail.mockResolvedValue(
        makeDbUser({ password_hash: passwordHash }),
      );
      repo.purgeExpiredChallenges.mockResolvedValue(undefined);
      repo.createChallenge.mockResolvedValue(undefined);

      const result = await service.login({
        email: "USER@example.com",
        password: "Password@1",
      });

      expect(repo.purgeExpiredChallenges).toHaveBeenCalled();
      expect(repo.createChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^mfa_/) as string,
          userId: "usr_1",
          otpCodeHash: expect.any(String) as string,
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/send"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          mfaRequired: true,
          challengeType: "email_otp",
          expiresIn: 300,
          user: { id: "usr_1", email: "user@example.com", role: "guest" },
        }),
      );
    });

    it("continues login even if OTP email sending fails", async () => {
      const passwordHash = (
        service as unknown as AuthServicePrivate
      ).hashPassword("Password@1");
      repo.findUserByEmail.mockResolvedValue(
        makeDbUser({ password_hash: passwordHash }),
      );
      repo.purgeExpiredChallenges.mockResolvedValue(undefined);
      repo.createChallenge.mockResolvedValue(undefined);
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("network")) as unknown as typeof fetch;

      const result = await service.login({
        email: "user@example.com",
        password: "Password@1",
      });

      expect(result.mfaRequired).toBe(true);
    });
  });

  describe("verifyMfaLogin", () => {
    it("throws when challengeId or code is missing", async () => {
      await expect(
        service.verifyMfaLogin({ challengeId: "", code: "" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws when challenge is missing", async () => {
      repo.findChallengeById.mockResolvedValue(null);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_x", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws and deletes challenge when expired", async () => {
      repo.findChallengeById.mockResolvedValue(
        makeChallenge({
          expires_at: new Date(Date.now() - 1_000).toISOString(),
        }),
      );
      repo.deleteChallengeById.mockResolvedValue(undefined);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_1", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_1");
    });

    it("throws and deletes challenge when attempts are exhausted", async () => {
      repo.findChallengeById.mockResolvedValue(makeChallenge({ attempts: 3 }));
      repo.deleteChallengeById.mockResolvedValue(undefined);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_1", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_1");
    });

    it("throws and increments attempts on invalid code", async () => {
      const challenge = makeChallenge({
        otp_code_hash: (service as unknown as AuthServicePrivate).hashOtp(
          "654321",
        ),
        attempts: 1,
      });
      repo.findChallengeById.mockResolvedValue(challenge);
      repo.findUserById.mockResolvedValue(makeDbUser());
      repo.incrementChallengeAttempts.mockResolvedValue(undefined);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_1", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.incrementChallengeAttempts).toHaveBeenCalledWith("mfa_1");
    });

    it("throws and deletes challenge when invalid code reaches max attempts", async () => {
      const challenge = makeChallenge({
        otp_code_hash: (service as unknown as AuthServicePrivate).hashOtp(
          "654321",
        ),
        attempts: 2,
      });
      repo.findChallengeById.mockResolvedValue(challenge);
      repo.findUserById.mockResolvedValue(makeDbUser());
      repo.deleteChallengeById.mockResolvedValue(undefined);

      await expect(
        service.verifyMfaLogin({ challengeId: "mfa_1", code: "123456" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_1");
    });

    it("returns access token and user when code is valid", async () => {
      const challenge = makeChallenge({
        otp_code_hash: (service as unknown as AuthServicePrivate).hashOtp(
          "123456",
        ),
      });
      repo.findChallengeById.mockResolvedValue(challenge);
      repo.findUserById.mockResolvedValue(makeDbUser());
      repo.deleteChallengeById.mockResolvedValue(undefined);

      const result = await service.verifyMfaLogin({
        challengeId: "mfa_1",
        code: "123456",
      });

      expect(repo.deleteChallengeById).toHaveBeenCalledWith("mfa_1");
      expect(result.tokenType).toBe("Bearer");
      expect(result.accessToken.split(".")).toHaveLength(3);
      expect(result.user).toEqual({
        id: "usr_1",
        email: "user@example.com",
        role: "guest",
      });
    });
  });

  describe("getUsers", () => {
    it("maps DB rows to public DTO", async () => {
      repo.listUsers.mockResolvedValue([
        makeDbUser({ created_at: "2026-01-02T00:00:00.000Z" }),
      ]);

      const result = await service.getUsers();

      expect(result).toEqual([
        {
          id: "usr_1",
          email: "user@example.com",
          role: "guest",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ]);
    });
  });
});
