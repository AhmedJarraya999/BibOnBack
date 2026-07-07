import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateDistributionPointDto } from './dto/create-distribution-point.dto';

interface AuthUser { id: string; role: UserRole; }

@Injectable()
export class DistributionPointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateDistributionPointDto, requester: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { organization: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);

    const point = await this.prisma.distributionPoint.create({
      data: {
        eventId: dto.eventId,
        name: dto.name,
        location: dto.location,
        volunteerNames: dto.volunteerNames ?? [],
        volunteerEmails: dto.volunteerEmails ?? [],
      },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const pickupUrl = `${appUrl}/distribute/${point.token}`;

    if (dto.volunteerEmails?.length) {
      for (let i = 0; i < dto.volunteerEmails.length; i++) {
        const email = dto.volunteerEmails[i];
        const name = dto.volunteerNames?.[i] ?? email.split('@')[0];
        await this.mail.sendBibDistributionAccess({
          to: email,
          name,
          eventName: event.name,
          eventDate: event.date,
          eventLocation: event.location,
          pickupUrl,
        });
      }
    }

    return { ...point, pickupUrl };
  }

  async findByEvent(eventId: string) {
    const points = await this.prisma.distributionPoint.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return points.map(p => ({ ...p, pickupUrl: `${appUrl}/distribute/${p.token}` }));
  }

  async findByToken(token: string) {
    const point = await this.prisma.distributionPoint.findUnique({
      where: { token },
      include: { event: { select: { id: true, name: true, date: true, location: true } } },
    });
    if (!point) throw new NotFoundException('Distribution point not found');
    return point;
  }

  async update(id: string, dto: Partial<CreateDistributionPointDto>, requester: AuthUser) {
    const point = await this.prisma.distributionPoint.findUnique({
      where: { id },
      include: { event: { include: { organization: true } } },
    });
    if (!point) throw new NotFoundException('Distribution point not found');
    this.assertOwnerOrAdmin(point.event.organization.ownerId, requester);

    return this.prisma.distributionPoint.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.volunteerNames && { volunteerNames: dto.volunteerNames }),
        ...(dto.volunteerEmails && { volunteerEmails: dto.volunteerEmails }),
      },
    });
  }

  async regenerateToken(id: string, requester: AuthUser) {
    const point = await this.prisma.distributionPoint.findUnique({
      where: { id },
      include: { event: { include: { organization: true } } },
    });
    if (!point) throw new NotFoundException('Distribution point not found');
    this.assertOwnerOrAdmin(point.event.organization.ownerId, requester);

    const { v4: uuidv4 } = await import('uuid');
    return this.prisma.distributionPoint.update({
      where: { id },
      data: { token: uuidv4() },
    });
  }

  async remove(id: string, requester: AuthUser) {
    const point = await this.prisma.distributionPoint.findUnique({
      where: { id },
      include: { event: { include: { organization: true } } },
    });
    if (!point) throw new NotFoundException('Distribution point not found');
    this.assertOwnerOrAdmin(point.event.organization.ownerId, requester);
    await this.prisma.distributionPoint.delete({ where: { id } });
    return { id };
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own this event');
    }
  }
}
