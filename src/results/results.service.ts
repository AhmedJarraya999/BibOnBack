import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { PrismaService } from '../prisma/prisma.service';

interface AuthUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeForRace(raceId: string, requester: AuthUser) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: { event: { include: { organization: true } } },
    });
    if (!race) throw new NotFoundException('Race not found');
    this.assertOwnerOrAdmin(race.event.organization.ownerId, requester);

    const finished = await this.prisma.registration.findMany({
      where: {
        raceId,
        status: RegistrationStatus.FINISHED,
        finishTime: { not: null },
      },
      orderBy: { finishTime: 'asc' },
    });

    const operations = finished.flatMap((registration, index) => {
      const rank = index + 1;
      return [
        this.prisma.raceResult.upsert({
          where: {
            raceId_participantId: {
              raceId,
              participantId: registration.participantId,
            },
          },
          create: {
            raceId,
            participantId: registration.participantId,
            finishTime: registration.finishTime!,
            rank,
          },
          update: {
            finishTime: registration.finishTime!,
            rank,
          },
        }),
        this.prisma.registration.update({
          where: { id: registration.id },
          data: { rank },
        }),
      ];
    });

    await this.prisma.$transaction(operations);
    return this.findByRace(raceId);
  }

  findByRace(raceId: string) {
    return this.prisma.raceResult.findMany({
      where: { raceId },
      orderBy: { rank: 'asc' },
    });
  }

  findByParticipant(participantId: string) {
    return this.prisma.raceResult.findMany({
      where: { participantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException(
        'You do not own the event this race belongs to',
      );
    }
  }
}
