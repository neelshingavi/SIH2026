import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Sends an outbound SMS using a generic aggregator (e.g., Twilio, Gupshup, CDAC)
   * @param to Phone number with country code
   * @param body Message content
   */
  async sendSms(to: string, body: string): Promise<boolean> {
    this.logger.log(`[MOCK] Sending SMS to ${to}: ${body}`);
    // In a real implementation:
    // await this.httpService.post('https://sms-aggregator.api...', { to, body })
    return true;
  }

  /**
   * Triggers an automated appointment reminder
   */
  async sendAppointmentReminder(patientPhone: string, date: string, facility: string) {
    const message = `Reminder: You have a scheduled visit at ${facility} on ${date}. Please bring your ABHA card.`;
    await this.sendSms(patientPhone, message);
  }

  /**
   * Triggers a follow-up nudge for high-risk patients
   */
  async sendHighRiskFollowUp(patientPhone: string, condition: string) {
    const message = `Health Alert: Please visit your nearest ASHA worker immediately for a follow-up regarding your ${condition}.`;
    await this.sendSms(patientPhone, message);
  }
}
