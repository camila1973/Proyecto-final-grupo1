import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthRepository } from "./auth/auth.repository";
import { AuthService } from "./auth/auth.service";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AppController],
  providers: [AuthService, AuthRepository],
})
export class AppModule {}
