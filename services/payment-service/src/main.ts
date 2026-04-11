import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  // rawBody: true is required for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  await app.listen(process.env.PORT ?? 3005);
}
void bootstrap();
