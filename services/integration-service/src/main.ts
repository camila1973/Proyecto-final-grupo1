import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { json, raw } from "express";
import { AppModule } from "./app.module";
import { runMigrations } from "./database/migrate";

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Raw body needed for HMAC verification in webhook endpoints
  app.use("/webhooks", raw({ type: "application/json" }));
  app.use(json());
  await app.listen(process.env.PORT ?? 3008);
}
void bootstrap();
