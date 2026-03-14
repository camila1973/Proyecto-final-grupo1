import { createHmac } from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AuthService } from "./auth/auth.service";
import type {
  LoginMfaResponse,
  LoginResponse,
  RegisterResponse,
} from "./auth/auth.types";

const decodeBase32 = (secret: string): Buffer => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 character");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotpCode = (secret: string, counter: number): string => {
  const key = decodeBase32(secret);
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
};

describe("AppController", () => {
  let appController: AppController;
  let mockAuthService: {
    register: jest.Mock;
    login: jest.Mock;
    verifyMfaLogin: jest.Mock;
    getUsers: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      verifyMfaLogin: jest.fn(),
      getUsers: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("health", () => {
    it("should return status ok and service name", () => {
      expect(appController.getHealth()).toEqual({
        status: "ok",
        service: "auth-service",
      });
    });
  });

  describe("register + login + mfa", () => {
    it("should register a new account and authenticate with MFA", async () => {
      const registration: RegisterResponse = {
        id: "usr_test",
        email: "new.user@travelhub.com",
        role: "guest",
        createdAt: new Date().toISOString(),
        mfa: {
          required: true,
          type: "totp",
          secret: "JBSWY3DPEHPK3PXP",
          otpauthUrl: "otpauth://totp/TravelHub:new.user@travelhub.com",
        },
      };
      mockAuthService.register.mockResolvedValue(registration);

      const registerResult = await appController.register({
        email: "new.user@travelhub.com",
        password: "StrongPass123",
      });

      expect(registerResult.id).toBe("usr_test");
      expect(registerResult.email).toBe("new.user@travelhub.com");
      expect(registerResult.role).toBe("guest");
      expect(registerResult.mfa.required).toBe(true);
      expect(registerResult.mfa.type).toBe("totp");
      expect(registerResult.mfa.secret.length).toBeGreaterThan(0);
      expect(registerResult.mfa.otpauthUrl).toContain("otpauth://totp/");

      const firstStepResponse: LoginResponse = {
        mfaRequired: true,
        challengeId: "mfa_test",
        challengeType: "totp",
        expiresIn: 300,
        user: {
          id: "usr_test",
          email: "new.user@travelhub.com",
          role: "guest",
        },
      };
      mockAuthService.login.mockResolvedValue(firstStepResponse);

      const firstStep = await appController.login({
        email: "new.user@travelhub.com",
        password: "StrongPass123",
      });

      expect(firstStep.mfaRequired).toBe(true);
      expect(firstStep.challengeId).toMatch(/^mfa_/);
      expect(firstStep.challengeType).toBe("totp");
      expect(firstStep.expiresIn).toBe(300);

      const counter = Math.floor(Date.now() / 1000 / 30);
      const code = generateTotpCode(registerResult.mfa.secret, counter);

      const secondStepResponse: LoginMfaResponse = {
        accessToken: "token",
        tokenType: "Bearer",
        expiresIn: 3600,
        user: {
          id: "usr_test",
          email: "new.user@travelhub.com",
          role: "guest",
        },
      };
      mockAuthService.verifyMfaLogin.mockResolvedValue(secondStepResponse);

      const secondStep: LoginMfaResponse = await appController.loginMfa({
        challengeId: firstStep.challengeId,
        code,
      });

      expect(secondStep.accessToken.length).toBeGreaterThan(0);
      expect(secondStep.tokenType).toBe("Bearer");
      expect(secondStep.expiresIn).toBe(3600);
      expect(secondStep.user.id).toBe(registerResult.id);
      expect(secondStep.user.email).toBe(registerResult.email);
    });
  });
});
