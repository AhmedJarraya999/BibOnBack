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
import { PublicRegistrationDto } from './dto/public-registration.dto';
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
          lieuDeRetrait: dto.lieuDeRetrait,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async findAll(
    filters: { raceId?: string; participantId?: string; userId?: string; isAdmin?: boolean },
    page: number,
    limit: number,
  ) {
    const { skip, take } = paginationParams(page, limit);
    const where = {
      ...(!filters.isAdmin && filters.userId && {
        race: { event: { organization: { ownerId: filters.userId } } },
      }),
      ...(filters.raceId && { raceId: filters.raceId }),
      ...(filters.participantId && { participantId: filters.participantId }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.registration.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { participant: true, race: { include: { event: true } } },
      }),
      this.prisma.registration.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: {
        participant: true,
        race: { include: { event: true } },
        distributions: true,
        medicalIncidents: { orderBy: { createdAt: 'desc' } },
      },
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
        existing.raceId,
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

  async dnf(id: string, reason?: string) {
    await this.findOne(id);
    return this.prisma.registration.update({
      where: { id },
      data: {
        status: RegistrationStatus.DNF,
        ...(reason && { medicalIncidents: {
          create: { severity: 'MINOR', description: reason },
        }}),
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

  async publicRegister(dto: PublicRegistrationDto) {
    const race = await this.prisma.race.findUnique({
      where: { id: dto.raceId },
      include: { event: true },
    });
    if (!race) throw new NotFoundException('Race not found');

    let participant = await this.prisma.participant.findUnique({ where: { email: dto.email } });
    if (!participant) {
      participant = await this.prisma.participant.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          birthdate: new Date(dto.birthdate),
          gender: dto.gender,
          phone: dto.phone,
          country: dto.country ?? 'Tunisie',
          bloodType: dto.bloodType,
          emergencyContact: dto.emergencyContact,
          emergencyPhone: dto.emergencyPhone,
          medicalConditions: dto.medicalConditions,
        },
      });
    } else {
      // Update medical fields if provided
      if (dto.bloodType || dto.emergencyContact || dto.emergencyPhone || dto.medicalConditions) {
        participant = await this.prisma.participant.update({
          where: { id: participant.id },
          data: {
            ...(dto.bloodType && { bloodType: dto.bloodType }),
            ...(dto.emergencyContact && { emergencyContact: dto.emergencyContact }),
            ...(dto.emergencyPhone && { emergencyPhone: dto.emergencyPhone }),
            ...(dto.medicalConditions && { medicalConditions: dto.medicalConditions }),
          },
        });
      }
    }

    const existing = await this.prisma.registration.findUnique({
      where: { participantId_raceId: { participantId: participant.id, raceId: dto.raceId } },
    });
    if (existing) {
      console.log(`[publicRegister] already registered — skipping provisionIfNeeded for ${dto.email}`);
      return { registration: existing, participant, alreadyRegistered: true };
    }

    const registration = await this.prisma.registration.create({
      data: { participantId: participant.id, raceId: dto.raceId, lieuDeRetrait: dto.lieuDeRetrait },
      include: { race: { include: { event: true } }, participant: true },
    });

    console.log(`[publicRegister] calling provisionIfNeeded for ${dto.email}`);
    // Create user account and send credentials email
    await this.participantAccounts.provisionIfNeeded(participant.id, race.name, dto.raceId);

    return { registration, participant, alreadyRegistered: false };
  }

  async lookup(raceId: string, search: string) {
    const registrations = await this.prisma.registration.findMany({
      where: {
        raceId,
        OR: [
          { bibNumber: { equals: search } },
          { participant: { fullName: { contains: search, mode: 'insensitive' } } },
          { participant: { email: { contains: search, mode: 'insensitive' } } },
          { participant: { phone: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: { participant: true, race: true, distributions: true },
      take: 10,
    });
    return registrations;
  }

  async raceLeaderboard(raceId: string) {
    const finishers = await this.prisma.registration.findMany({
      where: { raceId, status: 'FINISHED', finishTime: { not: null } },
      include: { participant: true },
      orderBy: [{ finishTime: 'asc' }],
    });
    return finishers.map((f, i) => ({
      rank: i + 1,
      registrationId: f.id,
      participantId: f.participantId,
      bibNumber: f.bibNumber,
      name: f.participant?.fullName ?? '—',
      gender: f.participant?.gender,
      country: (f.participant as any)?.country,
      startTime: f.startTime,
      finishTime: f.finishTime,
      elapsedMs: f.startTime && f.finishTime
        ? new Date(f.finishTime).getTime() - new Date(f.startTime).getTime()
        : null,
    }));
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

  async getStats(filters: { eventId?: string; raceId?: string; userId?: string; isAdmin?: boolean }) {
    let raceIds: string[];

    if (filters.raceId) {
      raceIds = [filters.raceId];
    } else if (filters.eventId) {
      const races = await this.prisma.race.findMany({
        where: { eventId: filters.eventId },
        select: { id: true },
      });
      raceIds = races.map((r) => r.id);
    } else {
      const where = (!filters.isAdmin && filters.userId)
        ? { event: { organization: { ownerId: filters.userId } } }
        : {};
      const races = await this.prisma.race.findMany({ where, select: { id: true } });
      raceIds = races.map((r) => r.id);
    }

    const regWhere = { raceId: { in: raceIds } };

    const [statusGroups, paymentGroups, distGroups, races] = await Promise.all([
      this.prisma.registration.groupBy({
        by: ['status'],
        where: regWhere,
        _count: { status: true },
      }),
      this.prisma.registration.groupBy({
        by: ['paymentStatus'],
        where: regWhere,
        _count: { paymentStatus: true },
      }),
      this.prisma.distribution.groupBy({
        by: ['itemType'],
        where: { registration: regWhere },
        _count: { itemType: true },
      }),
      this.prisma.race.findMany({
        where: { id: { in: raceIds } },
        select: { id: true, name: true },
      }),
    ]);

    const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count.status]));
    const byPayment = Object.fromEntries(paymentGroups.map((g) => [g.paymentStatus, g._count.paymentStatus]));
    const byItem = Object.fromEntries(distGroups.map((g) => [g.itemType, g._count.itemType]));

    const perRace = await Promise.all(
      races.map(async (race) => {
        const sg = await this.prisma.registration.groupBy({
          by: ['status'],
          where: { raceId: race.id },
          _count: { status: true },
        });
        const st = Object.fromEntries(sg.map((g) => [g.status, g._count.status]));
        const total = Object.values(st).reduce((a, b) => a + b, 0);
        return {
          raceId: race.id,
          raceName: race.name,
          total,
          registered: st['REGISTERED'] ?? 0,
          checkedIn: (st['CHECKED_IN'] ?? 0) + (st['FINISHED'] ?? 0) + (st['DISQUALIFIED'] ?? 0),
          finished: st['FINISHED'] ?? 0,
        };
      }),
    );

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

    return {
      total,
      registered: byStatus['REGISTERED'] ?? 0,
      checkedIn: (byStatus['CHECKED_IN'] ?? 0) + (byStatus['FINISHED'] ?? 0) + (byStatus['DISQUALIFIED'] ?? 0),
      finished: byStatus['FINISHED'] ?? 0,
      disqualified: byStatus['DISQUALIFIED'] ?? 0,
      paid: byPayment['PAID'] ?? 0,
      pending: byPayment['PENDING'] ?? 0,
      bibsDistributed: byItem['BIB_KIT'] ?? 0,
      tshirts: byItem['TSHIRT'] ?? 0,
      medals: byItem['MEDAL'] ?? 0,
      ravitos: byItem['RAVITO'] ?? 0,
      perRace,
      lastUpdated: new Date().toISOString(),
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
