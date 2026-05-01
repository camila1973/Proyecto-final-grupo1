import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { AuthService } from "./auth/auth.service";
import type {
  LoginBody,
  LoginMfaResponse,
  LoginResponse,
  MfaLoginBody,
  RegisterBody,
  RegisterResponse,
  UserListResponse,
} from "./auth/auth.types";

type HealthResponse = {
  status: "ok";
  service: "auth-service";
};

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get("health")
  getHealth(): HealthResponse {
    return { status: "ok", service: "auth-service" };
  }

  @Post("register")
  async register(@Body() body: RegisterBody): Promise<RegisterResponse> {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: LoginBody): Promise<LoginResponse> {
    return this.authService.login(body);
  }

  @Post("login/mfa")
  async loginMfa(@Body() body: MfaLoginBody): Promise<LoginMfaResponse> {
    return this.authService.verifyMfaLogin(body);
  }

  @Get("users")
  async getUsers(): Promise<UserListResponse> {
    return this.authService.getUsers();
  }

  @Post("internal/users")
  @HttpCode(HttpStatus.CREATED)
  async createInternalUser(
    @Body() body: RegisterBody,
  ): Promise<{ challengeId: string }> {
    return this.authService.registerInternal(body);
  }
}
