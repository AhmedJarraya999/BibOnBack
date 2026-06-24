import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DistributionsService } from './distributions.service';

const mockRegistration = { id: 'reg-1', raceId: 'race-1', participantId: 'p-1' };

const mockPrisma = {
  registration: {
    findUnique: jest.fn(),
  },
  distribution: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('DistributionsService', () => {
  let service: DistributionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DistributionsService(mockPrisma as unknown as PrismaService);
  });

  describe('issue', () => {
    it('creates a distribution when registration exists', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.distribution.create.mockResolvedValue({
        id: 'dist-1',
        registrationId: 'reg-1',
        itemType: 'MEDAL',
        issuedAt: new Date(),
      });

      const result = await service.issue('reg-1', { itemType: 'MEDAL' as any });

      expect(mockPrisma.distribution.create).toHaveBeenCalled();
      expect(result.itemType).toBe('MEDAL');
    });

    it('throws NotFoundException when registration does not exist', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(null);

      await expect(service.issue('bad-id', { itemType: 'MEDAL' as any })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException on duplicate issuance (P2002)', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.distribution.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.issue('reg-1', { itemType: 'MEDAL' as any })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByRegistration', () => {
    it('returns all distributions for a registration', async () => {
      const distributions = [
        { id: 'd-1', itemType: 'MEDAL' },
        { id: 'd-2', itemType: 'RAVITO' },
      ];
      mockPrisma.distribution.findMany.mockResolvedValue(distributions);

      const result = await service.findByRegistration('reg-1');

      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { registrationId: 'reg-1' } }),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('revoke', () => {
    it('deletes the distribution when it exists', async () => {
      mockPrisma.distribution.findUnique.mockResolvedValue({ id: 'd-1' });
      mockPrisma.distribution.delete.mockResolvedValue({ id: 'd-1' });

      const result = await service.revoke('reg-1', 'MEDAL');

      expect(mockPrisma.distribution.delete).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'd-1');
    });

    it('throws NotFoundException when distribution does not exist', async () => {
      mockPrisma.distribution.findUnique.mockResolvedValue(null);

      await expect(service.revoke('reg-1', 'MEDAL')).rejects.toThrow(NotFoundException);
    });
  });
});
