import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { runMigrations } from "./database/migrate";

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
