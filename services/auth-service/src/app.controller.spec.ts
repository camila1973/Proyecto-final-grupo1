import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AuthService } from "./auth/auth.service";
import type {
  LoginMfaResponse,
  LoginResponse,
  RegisterResponse,
} from "./auth/auth.types";

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

  describe("getUsers", () => {
    it("delegates to authService.getUsers and returns the result", async () => {
      const users = [
        {
          id: "usr_1",
          email: "a@b.com",
          role: "guest" as const,
          createdAt: "2024-01-01",
        },
      ];
      mockAuthService.getUsers.mockResolvedValue(users);

      const result = await appController.getUsers();

      expect(mockAuthService.getUsers).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe("register + login + mfa", () => {
    it("should register a new account and authenticate with email OTP", async () => {
      const registration: RegisterResponse = {
        id: "usr_test",
        email: "new.user@travelhub.com",
        role: "guest",
        createdAt: new Date().toISOString(),
      };
      mockAuthService.register.mockResolvedValue(registration);

      const registerResult = await appController.register({
        email: "new.user@travelhub.com",
        password: "StrongPass123",
      });

      expect(registerResult.id).toBe("usr_test");
      expect(registerResult.email).toBe("new.user@travelhub.com");
      expect(registerResult.role).toBe("guest");

      const firstStepResponse: LoginResponse = {
        mfaRequired: true,
        challengeId: "mfa_test",
        challengeType: "email_otp",
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
      expect(firstStep.challengeType).toBe("email_otp");
      expect(firstStep.expiresIn).toBe(300);

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
        code: "123456",
      });

      expect(secondStep.accessToken.length).toBeGreaterThan(0);
      expect(secondStep.tokenType).toBe("Bearer");
      expect(secondStep.expiresIn).toBe(3600);
      expect(secondStep.user.id).toBe(registerResult.id);
      expect(secondStep.user.email).toBe(registerResult.email);
    });
  });
});
