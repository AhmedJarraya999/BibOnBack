import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UserRole } from '../common/enums/user-role.enum';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipantAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async provisionIfNeeded(participantId: string, raceName: string, raceId?: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
    });
    console.log(`[provisionIfNeeded] participant=${participant?.email} userId=${participant?.userId}`);
    if (!participant || participant.userId) {
      console.log(`[provisionIfNeeded] skipping — already provisioned or not found`);
      return null;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: participant.email },
    });
    console.log(`[provisionIfNeeded] existingUser=${existingUser?.id ?? 'none'}`);
    if (existingUser) {
      await this.prisma.participant.update({
        where: { id: participantId },
        data: { userId: existingUser.id },
      });
      console.log(`[provisionIfNeeded] linked to existing user — no email sent`);
      return null;
    }

    const rawPassword = randomBytes(9).toString('base64url');
    const hashed = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: participant.fullName,
        email: participant.email,
        password: hashed,
        role: UserRole.PARTICIPANT,
      },
    });
    await this.prisma.participant.update({
      where: { id: participantId },
      data: { userId: user.id },
    });

    let eventName: string | undefined;
    let logoUrl: string | undefined;
    if (raceId) {
      const race = await this.prisma.race.findUnique({
        where: { id: raceId },
        include: { event: { include: { organization: true } } },
      });
      eventName = race?.event?.name;
      logoUrl = race?.event?.logoUrl ?? race?.event?.organization?.logoUrl ?? undefined;
    }

    await this.mail.sendParticipantCredentials({
      to: participant.email,
      fullName: participant.fullName,
      email: participant.email,
      password: rawPassword,
      raceName,
      eventName,
      logoUrl,
    });

    return { email: participant.email, password: rawPassword };
  }
}
