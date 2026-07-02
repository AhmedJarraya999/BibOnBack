import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRaceDto } from './dto/create-race.dto';
import { UpdateRaceDto } from './dto/update-race.dto';

interface AuthUser { id: string; role: UserRole; }

@Injectable()
export class RacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRaceDto, requester: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { organization: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);

    return this.prisma.race.create({
      data: { name: dto.name, distance: dto.distance, startTime: new Date(dto.startTime), eventId: dto.eventId, ...(dto.fee !== undefined && { fee: dto.fee }) },
    });
  }

  async findAll(page: number, limit: number, requester: AuthUser | null, filters?: { search?: string; eventId?: string }) {
    const { skip, take } = paginationParams(page, limit);

    let ownershipFilter: object;
    if (!requester) {
      // Public access — only allowed when filtered by eventId
      ownershipFilter = {};
    } else if (requester.role === UserRole.ADMIN) {
      ownershipFilter = {};
    } else if (requester.role === UserRole.VOLUNTEER) {
      const assignments = await this.prisma.volunteer.findMany({
        where: { userId: requester.id },
        select: { eventId: true },
      });
      const eventIds = assignments.map((a) => a.eventId);
      ownershipFilter = { eventId: { in: eventIds } };
    } else {
      ownershipFilter = { event: { organization: { ownerId: requester.id } } };
    }

    const where = {
      ...ownershipFilter,
      ...(filters?.eventId && { eventId: filters.eventId }),
      ...(filters?.search && {
        name: { contains: filters.search, mode: 'insensitive' as const },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.race.findMany({ where, skip, take, orderBy: { startTime: 'asc' } }),
      this.prisma.race.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const race = await this.prisma.race.findUnique({ where: { id } });
    if (!race) throw new NotFoundException('Race not found');
    return race;
  }

  async update(id: string, dto: UpdateRaceDto, requester: AuthUser) {
    const race = await this.findRaceWithOwner(id);
    this.assertOwnerOrAdmin(race.event.organization.ownerId, requester);
    return this.prisma.race.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.distance !== undefined && { distance: dto.distance }),
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.fee !== undefined && { fee: dto.fee }),
      },
    });
  }

  async remove(id: string, requester: AuthUser) {
    const race = await this.findRaceWithOwner(id);
    this.assertOwnerOrAdmin(race.event.organization.ownerId, requester);
    await this.prisma.race.delete({ where: { id } });
    return { id };
  }

  private async findRaceWithOwner(id: string) {
    const race = await this.prisma.race.findUnique({
      where: { id },
      include: { event: { include: { organization: true } } },
    });
    if (!race) throw new NotFoundException('Race not found');
    return race;
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own this race');
    }
  }
}
