import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';

import { PaymentStatus } from '../common/enums/payment-status.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { ParticipantAccountsService } from '../participants/participant-accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participantAccounts: ParticipantAccountsService,
  ) {}

  async create(dto: CreateRegistrationDto) {
    const [participant, race] = await Promise.all([
      this.prisma.participant.findUnique({ where: { id: dto.participantId } }),
      this.prisma.race.findUnique({ where: { id: dto.raceId } }),
    ]);
    if (!participant) throw new NotFoundException('Participant not found');
    if (!race) throw new NotFoundException('Race not found');

    try {
      return await this.prisma.registration.create({
        data: {
          participantId: dto.participantId,
          raceId: dto.raceId,
          bibNumber: dto.bibNumber,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async findAll(filters: { raceId?: string; participantId?: string }, page: number, limit: number) {
    const { skip, take } = paginationParams(page, limit);
    const where = {
      ...(filters.raceId && { raceId: filters.raceId }),
      ...(filters.participantId && { participantId: filters.participantId }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.registration.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.registration.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    return registration;
  }

  async update(id: string, dto: UpdateRegistrationDto) {
    const existing = await this.findOne(id);

    let updated;
    try {
      updated = await this.prisma.registration.update({
        where: { id },
        data: {
          ...(dto.bibNumber !== undefined && { bibNumber: dto.bibNumber }),
          ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
          ...(dto.finishTime && { finishTime: new Date(dto.finishTime), status: 'FINISHED' }),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
    }

    const justPaid =
      dto.paymentStatus === PaymentStatus.PAID &&
      existing.paymentStatus !== PaymentStatus.PAID;

    if (justPaid) {
      const race = await this.prisma.race.findUnique({ where: { id: existing.raceId } });
      const credentials = await this.participantAccounts.provisionIfNeeded(
        existing.participantId,
        race?.name ?? 'the race',
      );
      return { ...updated, credentials };
    }

    return updated;
  }

  async checkIn(id: string) {
    const registration = await this.findOne(id);
    this.assertStatus(registration.status, RegistrationStatus.REGISTERED, 'check in');

    return this.prisma.registration.update({
      where: { id },
      data: {
        status: RegistrationStatus.CHECKED_IN,
        startTime: new Date(),
      },
    });
  }

  async finish(id: string) {
    const registration = await this.findOne(id);
    this.assertStatus(registration.status, RegistrationStatus.CHECKED_IN, 'finish');

    return this.prisma.registration.update({
      where: { id },
      data: {
        status: RegistrationStatus.FINISHED,
        finishTime: new Date(),
      },
    });
  }

  async disqualify(id: string) {
    await this.findOne(id);

    return this.prisma.registration.update({
      where: { id },
      data: { status: RegistrationStatus.DISQUALIFIED },
    });
  }

  async findByBib(raceId: string, bibNumber: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { raceId_bibNumber: { raceId, bibNumber } },
      include: { participant: true, race: true },
    });
    if (!registration) {
      throw new NotFoundException(
        `No registration found for bib #${bibNumber} in this race`,
      );
    }
    return registration;
  }

  async getAttendance(raceId: string) {
    const counts = await this.prisma.registration.groupBy({
      by: ['status'],
      where: { raceId },
      _count: { status: true },
    });

    const byStatus = Object.fromEntries(
      counts.map((c) => [c.status, c._count.status]),
    );

    const checkedIn =
      (byStatus[RegistrationStatus.CHECKED_IN] ?? 0) +
      (byStatus[RegistrationStatus.FINISHED] ?? 0) +
      (byStatus[RegistrationStatus.DISQUALIFIED] ?? 0);

    const notArrived = byStatus[RegistrationStatus.REGISTERED] ?? 0;

    return {
      totalRegistered: checkedIn + notArrived,
      checkedIn,
      notArrived,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.registration.delete({ where: { id } });
    return { id };
  }

  private assertStatus(
    current: string,
    expected: RegistrationStatus,
    action: string,
  ) {
    if (current !== expected) {
      throw new ConflictException(
        `Cannot ${action}: registration is in status "${current}", expected "${expected}"`,
      );
    }
  }

  private handleUniqueConstraint(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Bib number already taken for this race, or participant already registered for this race',
      );
    }
    throw error;
  }
}
