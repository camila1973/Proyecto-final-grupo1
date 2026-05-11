import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { DeviceTokensService } from "./device-tokens.service.js";

@Controller("notifications/device-tokens")
export class DeviceTokensController {
  constructor(private readonly svc: DeviceTokensService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(
    @Body()
    body: {
      userId: string;
      token: string;
      platform: "ios" | "android";
    },
  ): Promise<void> {
    await this.svc.upsert(body.userId, body.token, body.platform);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(
    @Body() body: { userId: string; token: string },
  ): Promise<void> {
    await this.svc.remove(body.userId, body.token);
  }
}
