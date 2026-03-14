import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Post("register")
  register(@Body() body: { email: string; password: string }) {
    return this.appService.register(body);
  }

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.appService.login(body);
  }

  @Get("users")
  getUsers() {
    return this.appService.getUsers();
  }
}
