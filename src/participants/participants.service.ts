import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParticipantDto) {
    const exists = await this.prisma.participant.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    return this.prisma.participant.create({
      data: { fullName: dto.fullName, birthdate: new Date(dto.birthdate), gender: dto.gender, email: dto.email },
    });
  }

  async findAll(page: number, limit: number, search?: string) {
    const { skip, take } = paginationParams(page, limit);
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.participant.findMany({ where, skip, take, orderBy: { fullName: 'asc' } }),
      this.prisma.participant.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findUnique({ where: { id } });
    if (!participant) throw new NotFoundException('Participant not found');
    return participant;
  }

  async findByUserId(userId: string) {
    const participant = await this.prisma.participant.findFirst({ where: { userId } });
    if (!participant) throw new NotFoundException('No participant profile linked to this account');
    return participant;
  }

  async update(id: string, dto: UpdateParticipantDto) {
    await this.findOne(id);
    return this.prisma.participant.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.birthdate && { birthdate: new Date(dto.birthdate) }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.email && { email: dto.email }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.participant.delete({ where: { id } });
    return { id };
  }
}
