import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { AvailabilityStore } from './availability.store.js';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, AvailabilityStore],
  exports: [AvailabilityStore],
})
export class WebhooksModule {}
