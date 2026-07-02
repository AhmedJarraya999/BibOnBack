import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../common/enums/user-role.enum';
import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { InviteVolunteerDto } from './dto/invite-volunteer.dto';

interface AuthUser { id: string; role: UserRole; }

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async invite(dto: InviteVolunteerDto, requester: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { organization: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);

    const permissions = dto.permissions ?? ['CHECK_IN'];
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    let isNewAccount = false;
    let tempPassword: string | undefined;

    if (!user) {
      isNewAccount = true;
      tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const hashed = await bcrypt.hash(tempPassword, 10);
      user = await this.prisma.user.create({
        data: {
          name: dto.name ?? dto.email.split('@')[0],
          email: dto.email,
          password: hashed,
          role: UserRole.VOLUNTEER,
        },
      });
    }

    try {
      const volunteer = await this.prisma.volunteer.create({
        data: { userId: user.id, eventId: dto.eventId, permissions },
        include: { user: true, event: true },
      });

      await this.mail.sendVolunteerInvite({
        to: user.email,
        name: user.name,
        email: user.email,
        eventName: event.name,
        permissions,
        isNewAccount,
        password: tempPassword,
        appUrl,
      });

      return volunteer;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This user is already a volunteer for this event');
      }
      throw error;
    }
  }

  async create(dto: CreateVolunteerDto, requester: AuthUser) {
    const [user, event] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.event.findUnique({ where: { id: dto.eventId }, include: { organization: true } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!event) throw new NotFoundException('Event not found');
    this.assertOwnerOrAdmin(event.organization.ownerId, requester);

    try {
      return await this.prisma.volunteer.create({
        data: { userId: dto.userId, eventId: dto.eventId, permissions: dto.permissions },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This user is already a volunteer for this event');
      }
      throw error;
    }
  }

  async findAll(filters: { eventId?: string; userId?: string }, page: number, limit: number) {
    const { skip, take } = paginationParams(page, limit);
    const where = {
      ...(filters.eventId && { eventId: filters.eventId }),
      ...(filters.userId && { userId: filters.userId }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.volunteer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: true, event: true } }),
      this.prisma.volunteer.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) throw new NotFoundException('Volunteer assignment not found');
    return volunteer;
  }

  async update(id: string, dto: UpdateVolunteerDto, requester: AuthUser) {
    const volunteer = await this.findVolunteerWithOwner(id);
    this.assertOwnerOrAdmin(volunteer.event.organization.ownerId, requester);
    return this.prisma.volunteer.update({ where: { id }, data: { permissions: dto.permissions } });
  }

  async remove(id: string, requester: AuthUser) {
    const volunteer = await this.findVolunteerWithOwner(id);
    this.assertOwnerOrAdmin(volunteer.event.organization.ownerId, requester);
    await this.prisma.volunteer.delete({ where: { id } });
    return { id };
  }

  private async findVolunteerWithOwner(id: string) {
    const volunteer = await this.prisma.volunteer.findUnique({
      where: { id },
      include: { event: { include: { organization: true } } },
    });
    if (!volunteer) throw new NotFoundException('Volunteer assignment not found');
    return volunteer;
  }

  private assertOwnerOrAdmin(ownerId: string, requester: AuthUser) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own the event this volunteer is assigned to');
    }
  }
}
