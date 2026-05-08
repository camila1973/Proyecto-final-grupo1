import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
  RequestMethod,
} from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthMiddleware } from "./auth/auth.middleware";
import { getJwtSecret } from "./auth/jwt.config";
import { JwtVerifier } from "./auth/jwt.verifier";
import { ProxyController } from "./proxy.controller";
import { ProxyService } from "./proxy.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { algorithm: "HS256" },
      }),
    }),
  ],
  controllers: [AppController, ProxyController],
  providers: [AppService, ProxyService, JwtVerifier, AuthMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: "api/*", method: RequestMethod.ALL });
  }
}
