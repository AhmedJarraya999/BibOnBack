import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantAccountsService } from '../participants/participant-accounts.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participantAccounts: ParticipantAccountsService,
  ) {}

  async initiatePayment(registrationId: string, successUrl: string, failUrl: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { race: true, participant: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.paymentStatus === 'PAID') {
      throw new BadRequestException('Registration is already paid');
    }

    const fee = Number(registration.race.fee);
    if (fee <= 0) throw new BadRequestException('This race has no fee');

    const amountMillimes = Math.round(fee * 1000);

    const response = await axios.post(
      'https://developers.flouci.com/api/generate_payment',
      {
        app_token: process.env.FLOUCI_APP_TOKEN,
        app_secret: process.env.FLOUCI_APP_SECRET,
        amount: amountMillimes,
        accept_card: true,
        session_timeout_secs: 1200,
        success_link: successUrl,
        fail_link: failUrl,
        developer_tracking_id: registrationId,
      },
    );

    return { paymentUrl: response.data.result?.link, paymentId: response.data.result?.payment_id };
  }

  async verifyPayment(paymentId: string, registrationId: string) {
    const response = await axios.get(
      `https://developers.flouci.com/api/verify_payment/${paymentId}`,
      {
        headers: {
          apppublic: process.env.FLOUCI_APP_TOKEN,
          appsecret: process.env.FLOUCI_APP_SECRET,
        },
      },
    );

    const result = response.data?.result;
    if (!result || result.status !== 'SUCCESS') {
      throw new BadRequestException('Payment not verified');
    }

    const registration = await this.prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: 'PAID', flouciPaymentId: paymentId },
      include: { race: true },
    });

    const credentials = await this.participantAccounts.provisionIfNeeded(
      registration.participantId,
      registration.race.name,
    );

    return { registration, credentials };
  }
}
