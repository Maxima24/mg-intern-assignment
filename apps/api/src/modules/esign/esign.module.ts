import { Module } from '@nestjs/common';
import { EsignController } from './esign.controller';
import { EsignService } from './esign.service';
import { EsignRepository } from './esign.repository';
import { SetuWebhookController } from './setu-webhook.controller';

@Module({
  controllers: [EsignController, SetuWebhookController],
  providers: [EsignService, EsignRepository],
})
export class EsignModule {}
