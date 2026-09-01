import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { SmsService } from './sms.service.js';

@Controller('webhook/sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(private readonly smsService: SmsService) {}

  /**
   * Webhook to receive incoming SMS (e.g., from an offline frontline worker)
   * The payload is expected to be a Base64 encoded compressed FHIR resource or action.
   */
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  async handleInboundSms(@Body() payload: any) {
    this.logger.log(`Received inbound SMS webhook payload: ${JSON.stringify(payload)}`);
    
    // 1. Extract sender and text
    const sender = payload.From || payload.sender;
    const body = payload.Body || payload.text;

    if (!body) {
      return { status: 'ignored', reason: 'empty body' };
    }

    try {
      // 2. Decode the Base64 compressed payload
      const decodedBuffer = Buffer.from(body, 'base64');
      const jsonString = decodedBuffer.toString('utf-8');
      
      this.logger.log(`Decoded SMS payload from ${sender}: ${jsonString}`);
      
      // 3. Process the offline action (e.g., register patient, trigger emergency)
      // await this.fhirSyncService.processOfflinePayload(jsonString);

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Failed to process inbound SMS from ${sender}`, error);
      return { status: 'error', reason: 'Invalid payload format' };
    }
  }
}
