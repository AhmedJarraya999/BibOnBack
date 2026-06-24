import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { paginatedResponse, paginationParams } from '../common/utils/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: { name: dto.name, ownerId },
    });
  }

  async findAll(page: number, limit: number) {
    const { skip, take } = paginationParams(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.organization.count(),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto, requester: { id: string; role: UserRole }) {
    const organization = await this.findOne(id);
    this.assertOwnerOrAdmin(organization.ownerId, requester);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async remove(id: string, requester: { id: string; role: UserRole }) {
    const organization = await this.findOne(id);
    this.assertOwnerOrAdmin(organization.ownerId, requester);
    await this.prisma.organization.delete({ where: { id } });
    return { id };
  }

  private assertOwnerOrAdmin(ownerId: string, requester: { id: string; role: UserRole }) {
    if (requester.role !== UserRole.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not own this organization');
    }
  }
}
