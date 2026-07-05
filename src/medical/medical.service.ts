import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class MedicalService {
  constructor(private readonly prisma: PrismaService) {}

  async lookupByBib(raceId: string, bibNumber: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { raceId_bibNumber: { raceId, bibNumber } },
      include: {
        participant: true,
        race: { include: { event: true } },
        medicalIncidents: { orderBy: { createdAt: 'desc' } },
        distributions: true,
      },
    });
    if (!registration) throw new NotFoundException(`Bib #${bibNumber} not found in this race`);
    return registration;
  }

  async lookupById(registrationId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        participant: true,
        race: { include: { event: true } },
        medicalIncidents: { orderBy: { createdAt: 'desc' } },
        distributions: true,
      },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    return registration;
  }

  async logIncident(dto: CreateIncidentDto, volunteerId?: string) {
    return this.prisma.medicalIncident.create({
      data: {
        registrationId: dto.registrationId,
        severity: dto.severity,
        location: dto.location,
        description: dto.description,
        actionTaken: dto.actionTaken,
        reportedByVolunteerId: volunteerId,
      },
    });
  }

  async findIncidents(raceId: string) {
    return this.prisma.medicalIncident.findMany({
      where: { registration: { raceId } },
      include: {
        registration: { include: { participant: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteIncident(id: string) {
    return this.prisma.medicalIncident.delete({ where: { id } });
  }
}
