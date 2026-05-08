import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AppController } from "./app.controller";
import { AuthRepository } from "./auth/auth.repository";
import { AuthService } from "./auth/auth.service";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret:
        process.env.AUTH_JWT_SECRET ?? "travelhub-dev-jwt-secret-change-me",
      signOptions: { algorithm: "HS256" },
    }),
  ],
  controllers: [AppController],
  providers: [AuthService, AuthRepository],
})
export class AppModule {}
