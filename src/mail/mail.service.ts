import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendParticipantCredentials(params: {
    to: string;
    fullName: string;
    email: string;
    password: string;
    raceName: string;
  }) {
    try {
      await this.mailer.sendMail({
        to: params.to,
        subject: `Your login credentials — ${params.raceName}`,
        template: 'participant-credentials',
        context: {
          fullName: params.fullName,
          email: params.email,
          password: params.password,
          raceName: params.raceName,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to send credentials email to ${params.to}: ${err.message}`);
    }
  }
}
