import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ResolveReclamationDto } from './dto/resolve-reclamation.dto';

@Injectable()
export class ReclamationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateReclamationDto, volunteerId?: string) {
    return this.prisma.reclamation.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        note: dto.note,
        proofDescription: dto.proofDescription,
        temporaryBib: dto.temporaryBib,
        eventId: dto.eventId,
        raceId: dto.raceId,
        flaggedByVolunteerId: volunteerId,
      },
      include: { event: { select: { name: true } }, race: { select: { name: true } } },
    });
  }

  findAll(eventId?: string, raceId?: string, status?: string) {
    return this.prisma.reclamation.findMany({
      where: {
        ...(eventId && { eventId }),
        ...(raceId && { raceId }),
        ...(status && { status: status as any }),
      },
      include: {
        event: { select: { name: true } },
        race: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, dto: ResolveReclamationDto) {
    const rec = await this.prisma.reclamation.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Reclamation not found');
    return this.prisma.reclamation.update({
      where: { id },
      data: { status: dto.status as any, resolvedNote: dto.resolvedNote },
    });
  }

  async remove(id: string) {
    const rec = await this.prisma.reclamation.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Reclamation not found');
    return this.prisma.reclamation.delete({ where: { id } });
  }
}
