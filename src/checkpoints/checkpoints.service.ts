import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { ScanCheckpointDto } from './dto/scan-checkpoint.dto';

interface AuthUser { id: string; role: UserRole; }

@Injectable()
export class CheckpointsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCheckpointDto, requester: AuthUser) {
    const race = await this.getRaceWithOrg(dto.raceId);
    this.assertOwnerOrAdmin(race.event.organization.ownerId, requester);

    return this.prisma.checkpoint.create({
      data: {
        raceId: dto.raceId,
        name: dto.name,
        order: dto.order,
        type: dto.type,
        cutoffTime: dto.cutoffTime ? new Date(dto.cutoffTime) : undefined,
        items: dto.items ?? [],
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async findByRace(raceId: string) {
    return this.prisma.checkpoint.findMany({
      where: { raceId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { scans: true } },
        assignments: {
          include: { volunteer: { include: { user: true } } },
        },
      },
    });
  }

  async findOne(id: string) {
    const cp = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: {
        _count: { select: { scans: true } },
        assignments: {
          include: { volunteer: { include: { user: true } } },
        },
        scans: {
          include: { registration: { include: { participant: true } } },
          orderBy: { scannedAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!cp) throw new NotFoundException('Checkpoint not found');
    return cp;
  }

  async assignVolunteer(checkpointId: string, volunteerId: string, requester: AuthUser) {
    const cp = await this.prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      include: { race: { include: { event: { include: { organization: true } } } } },
    });
    if (!cp) throw new NotFoundException('Checkpoint not found');
    this.assertOwnerOrAdmin(cp.race.event.organization.ownerId, requester);

    const volunteer = await this.prisma.volunteer.findUnique({ where: { id: volunteerId } });
    if (!volunteer) throw new NotFoundException('Volunteer not found');
    if (volunteer.eventId !== cp.race.eventId) throw new ForbiddenException('Volunteer not in this event');

    return this.prisma.checkpointAssignment.upsert({
      where: { checkpointId_volunteerId: { checkpointId, volunteerId } },
      create: { checkpointId, volunteerId },
      update: {},
      include: { volunteer: { include: { user: true } } },
    });
  }

  async unassignVolunteer(checkpointId: string, volunteerId: string, requester: AuthUser) {
    const cp = await this.prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      include: { race: { include: { event: { include: { organization: true } } } } },
    });
    if (!cp) throw new NotFoundException('Checkpoint not found');
    this.assertOwnerOrAdmin(cp.race.event.organization.ownerId, requester);

    await this.prisma.checkpointAssignment.delete({
      where: { checkpointId_volunteerId: { checkpointId, volunteerId } },
    });
    return { checkpointId, volunteerId };
  }

  async update(id: string, dto: UpdateCheckpointDto, requester: AuthUser) {
    const cp = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: { race: { include: { event: { include: { organization: true } } } } },
    });
    if (!cp) throw new NotFoundException('Checkpoint not found');
    this.assertOwnerOrAdmin(cp.race.event.organization.ownerId, requester);

    return this.prisma.checkpoint.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.type && { type: dto.type }),
        ...(dto.cutoffTime !== undefined && { cutoffTime: dto.cutoffTime ? new Date(dto.cutoffTime) : null }),
        ...(dto.items && { items: dto.items }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      },
    });
  }

  async remove(id: string, requester: AuthUser) {
    const cp = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: { race: { include: { event: { include: { organization: true } } } } },
    });
    if (!cp) throw new NotFoundException('Checkpoint not found');
    this.assertOwnerOrAdmin(cp.race.event.organization.ownerId, requester);
    await this.prisma.checkpoint.delete({ where: { id } });
    return { id };
  }

  async scan(id: string, dto: ScanCheckpointDto, volunteerId: string) {
    const cp = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!cp) throw new NotFoundException('Checkpoint not found');

    const registration = await this.prisma.registration.findUnique({
      where: { id: dto.registrationId },
      include: { participant: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.raceId !== cp.raceId) throw new ForbiddenException('Registration does not belong to this race');

    const existing = await this.prisma.checkpointScan.findUnique({
      where: { checkpointId_registrationId: { checkpointId: id, registrationId: dto.registrationId } },
    });
    if (existing) throw new ConflictException('Already scanned at this checkpoint');

    const scan = await this.prisma.checkpointScan.create({
      data: {
        checkpointId: id,
        registrationId: dto.registrationId,
        volunteerId,
        scannedAt: new Date(),
      },
      include: {
        registration: { include: { participant: true } },
        checkpoint: true,
      },
    });

    return scan;
  }

  async getScans(id: string) {
    const cp = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!cp) throw new NotFoundException('Checkpoint not found');

    return this.prisma.checkpointScan.findMany({
      where: { checkpointId: id },
      include: { registration: { include: { participant: true } } },
      orderBy: { scannedAt: 'desc' },
    });
  }

  async getRunnerProgress(raceId: string, registrationId: string) {
    const checkpoints = await this.prisma.checkpoint.findMany({
      where: { raceId },
      orderBy: { order: 'asc' },
      include: {
        scans: { where: { registrationId } },
      },
    });

    return checkpoints.map((cp) => ({
      id: cp.id,
      name: cp.name,
      order: cp.order,
      type: cp.type,
      cutoffTime: cp.cutoffTime,
      passed: cp.scans.length > 0,
      passedAt: cp.scans[0]?.scannedAt ?? null,
    }));
  }

  private async getRaceWithOrg(raceId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: { event: { include: { organization: true } } },
    });
    if (!race) throw new NotFoundException('Race not found');
    return race;
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own this resource');
    }
  }
}
