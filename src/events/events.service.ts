import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { slugify } from '../common/utils/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

interface AuthUser { id: string; role: UserRole; }

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, requester: AuthUser) {
    const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!organization) throw new NotFoundException('Organization not found');
    this.assertOwnerOrAdmin(organization.ownerId, requester);

    const slug = await this.uniqueSlug(slugify(dto.name));

    return this.prisma.event.create({
      data: {
        name: dto.name,
        slug,
        location: dto.location,
        date: new Date(dto.date),
        paymentMode: dto.paymentMode,
        logoUrl: dto.logoUrl,
        organizationId: dto.organizationId,
      },
    });
  }

  async findAll(page: number, limit: number, requester: AuthUser, organizationId?: string) {
    const { skip, take } = paginationParams(page, limit);
    const where = {
      ...(requester.role !== UserRole.ADMIN && { organization: { ownerId: requester.id } }),
      ...(organizationId && { organizationId }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
      this.prisma.event.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, dto: UpdateEventDto, requester: AuthUser) {
    const event = await this.findEventWithOrganization(id);
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.location && { location: dto.location }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.paymentMode && { paymentMode: dto.paymentMode }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  async remove(id: string, requester: AuthUser) {
    const event = await this.findEventWithOrganization(id);
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);
    await this.prisma.event.delete({ where: { id } });
    return { id };
  }

  private async findEventWithOrganization(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id }, include: { organization: true } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.prisma.event.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own this event');
    }
  }
}
