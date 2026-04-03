import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { runMigrations } from "./database/migrate.js";

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
