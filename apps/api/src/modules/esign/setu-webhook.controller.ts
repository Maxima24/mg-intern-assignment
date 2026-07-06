import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppError } from '../../common/utils/app-error';
import { SetuClient } from '../setu/setu.client';
import { EsignService } from './esign.service';
import { SetuWebhookDto, type SetuWebhookPayload } from './dto/setu-webhook.dto';

/**
 * Receives Setu eSign status notifications. Lives in the Esign module (not Setu)
 * to avoid a circular module dependency: it needs EsignService. HMAC verification
 * runs against the RAW request bytes (main.ts sets rawBody:true); stub mode bypasses.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class SetuWebhookController {
  private readonly logger = new Logger(SetuWebhookController.name);

  constructor(
    private readonly setu: SetuClient,
    private readonly esign: EsignService,
  ) {}

  @Post('setu')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Setu eSign status notifications (HMAC-verified)' })
  @ApiBody({ type: SetuWebhookDto })
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-setu-signature') signature?: string,
  ): Promise<{ received: true }> {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    if (!this.setu.verifyWebhookSignature(raw, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
    }

    const body = req.body as SetuWebhookPayload;
    if (!body?.event) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Malformed webhook payload');
    }

    await this.esign.applyWebhook(body);
    return { received: true };
  }
}
