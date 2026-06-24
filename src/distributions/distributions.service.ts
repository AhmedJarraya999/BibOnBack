import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';

@Injectable()
export class DistributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(registrationId: string, dto: CreateDistributionDto) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      throw new NotFoundException(`Registration ${registrationId} not found`);
    }

    try {
      return await this.prisma.distribution.create({
        data: {
          registrationId,
          itemType: dto.itemType,
          issuedByVolunteerId: dto.issuedByVolunteerId ?? null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Item ${dto.itemType} has already been issued for this registration`,
        );
      }
      throw err;
    }
  }

  findByRegistration(registrationId: string) {
    return this.prisma.distribution.findMany({
      where: { registrationId },
      orderBy: { issuedAt: 'asc' },
    });
  }

  async revoke(registrationId: string, itemType: string) {
    const existing = await this.prisma.distribution.findUnique({
      where: {
        registrationId_itemType: {
          registrationId,
          itemType: itemType as any,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(
        `No ${itemType} distribution found for registration ${registrationId}`,
      );
    }
    return this.prisma.distribution.delete({
      where: {
        registrationId_itemType: {
          registrationId,
          itemType: itemType as any,
        },
      },
    });
  }
}
