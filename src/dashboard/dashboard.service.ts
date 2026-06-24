import { Injectable, NotFoundException } from '@nestjs/common';

import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getUpcomingRaces(userId: string) {
    const participant = await this.findParticipantByUserId(userId);

    return this.prisma.registration.findMany({
      where: {
        participantId: participant.id,
        status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.CHECKED_IN] },
      },
      include: { race: { include: { event: true } } },
    });
  }

  async getResults(userId: string) {
    const participant = await this.findParticipantByUserId(userId);

    return this.prisma.raceResult.findMany({
      where: { participantId: participant.id },
      include: { race: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(userId: string) {
    const participant = await this.findParticipantByUserId(userId);

    const results = await this.prisma.raceResult.findMany({
      where: { participantId: participant.id },
      include: { race: true },
    });

    return Promise.all(
      results.map(async (result) => {
        const totalFinishers = await this.prisma.raceResult.count({
          where: { raceId: result.raceId },
        });
        return {
          raceId: result.raceId,
          raceName: result.race.name,
          finishTime: result.finishTime,
          rank: result.rank,
          totalFinishers,
          percentile: Math.round(((totalFinishers - result.rank + 1) / totalFinishers) * 100),
        };
      }),
    );
  }

  private async findParticipantByUserId(userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { userId },
    });
    if (!participant) {
      throw new NotFoundException('No participant profile linked to this account');
    }
    return participant;
  }
}
