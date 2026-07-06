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
        description: dto.description,
        location: dto.location,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
        timezone: dto.timezone,
        date: new Date(dto.date),
        contactEmail: dto.contactEmail,
        externalUrl: dto.externalUrl,
        externalResultsUrl: dto.externalResultsUrl,
        facebookPageId: dto.facebookPageId,
        facebookEventId: dto.facebookEventId,
        paymentMode: dto.paymentMode,
        processingFeeMode: dto.processingFeeMode,
        acceptDonations: dto.acceptDonations ?? false,
        supportNonBinary: dto.supportNonBinary ?? false,
        allowPreferNotToSay: dto.allowPreferNotToSay ?? false,
        isFirstYear: dto.isFirstYear ?? true,
        estimatedParticipants: dto.estimatedParticipants,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        pickupLocations: dto.pickupLocations ?? [],
        organizationId: dto.organizationId,
      },
    });
  }

  async findAll(page: number, limit: number, requester: AuthUser, organizationId?: string) {
    const { skip, take } = paginationParams(page, limit);

    // Volunteers see only events they're assigned to
    if (requester.role === UserRole.VOLUNTEER) {
      const assignments = await this.prisma.volunteer.findMany({
        where: { userId: requester.id },
        select: { eventId: true },
      });
      const eventIds = [...new Set(assignments.map((a) => a.eventId))];
      const where = {
        id: { in: eventIds },
        ...(organizationId && { organizationId }),
      };
      const [data, total] = await this.prisma.$transaction([
        this.prisma.event.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
        this.prisma.event.count({ where }),
      ]);
      return paginatedResponse(data, total, page, limit);
    }

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

  async searchPublic(q: string, limit: number) {
    const where = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : {};
    return this.prisma.event.findMany({
      where,
      take: Math.min(limit, 50),
      orderBy: { date: 'asc' },
      select: { id: true, name: true, date: true, location: true, logoUrl: true, slug: true },
    });
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
        ...(dto.pickupLocations !== undefined && { pickupLocations: dto.pickupLocations }),
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
