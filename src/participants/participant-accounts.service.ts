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

  async provisionIfNeeded(participantId: string, raceName: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
    });
    if (!participant || participant.userId) return null;

    const existingUser = await this.prisma.user.findUnique({
      where: { email: participant.email },
    });
    if (existingUser) {
      await this.prisma.participant.update({
        where: { id: participantId },
        data: { userId: existingUser.id },
      });
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

    await this.mail.sendParticipantCredentials({
      to: participant.email,
      fullName: participant.fullName,
      email: participant.email,
      password: rawPassword,
      raceName,
    });

    return { email: participant.email, password: rawPassword };
  }
}
