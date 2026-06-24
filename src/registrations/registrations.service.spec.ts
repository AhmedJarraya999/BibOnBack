import { ConflictException, NotFoundException } from '@nestjs/common';

import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantAccountsService } from '../participants/participant-accounts.service';
import { RegistrationsService } from './registrations.service';

const mockRegistration = {
  id: 'reg-1',
  participantId: 'participant-1',
  raceId: 'race-1',
  bibNumber: '42',
  status: RegistrationStatus.REGISTERED,
  paymentStatus: PaymentStatus.PENDING,
  startTime: null,
  finishTime: null,
  rank: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  registration: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  participant: { findUnique: jest.fn() },
  race: { findUnique: jest.fn() },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
};

const mockParticipantAccounts = {
  provisionIfNeeded: jest.fn().mockResolvedValue(null),
};

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RegistrationsService(
      mockPrisma as unknown as PrismaService,
      mockParticipantAccounts as unknown as ParticipantAccountsService,
    );
  });

  describe('create', () => {
    it('creates a registration when participant and race exist', async () => {
      mockPrisma.participant.findUnique.mockResolvedValue({ id: 'participant-1' });
      mockPrisma.race.findUnique.mockResolvedValue({ id: 'race-1' });
      mockPrisma.registration.create.mockResolvedValue(mockRegistration);

      const result = await service.create({
        participantId: 'participant-1',
        raceId: 'race-1',
        bibNumber: '42',
      });

      expect(result).toEqual(mockRegistration);
    });

    it('throws NotFoundException when participant does not exist', async () => {
      mockPrisma.participant.findUnique.mockResolvedValue(null);
      mockPrisma.race.findUnique.mockResolvedValue({ id: 'race-1' });

      await expect(
        service.create({ participantId: 'bad-id', raceId: 'race-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when race does not exist', async () => {
      mockPrisma.participant.findUnique.mockResolvedValue({ id: 'participant-1' });
      mockPrisma.race.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ participantId: 'participant-1', raceId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkIn', () => {
    it('sets status to CHECKED_IN when currently REGISTERED', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.registration.update.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CHECKED_IN,
      });

      const result = await service.checkIn('reg-1');

      expect(mockPrisma.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RegistrationStatus.CHECKED_IN }),
        }),
      );
      expect(result.status).toBe(RegistrationStatus.CHECKED_IN);
    });

    it('throws ConflictException when already CHECKED_IN', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CHECKED_IN,
      });

      await expect(service.checkIn('reg-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('finish', () => {
    it('sets status to FINISHED when currently CHECKED_IN', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CHECKED_IN,
      });
      mockPrisma.registration.update.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.FINISHED,
      });

      const result = await service.finish('reg-1');

      expect(result.status).toBe(RegistrationStatus.FINISHED);
    });

    it('throws ConflictException when not CHECKED_IN', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);

      await expect(service.finish('reg-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('provisions participant account when payment changes to PAID', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.registration.update.mockResolvedValue({
        ...mockRegistration,
        paymentStatus: PaymentStatus.PAID,
      });
      mockPrisma.race.findUnique.mockResolvedValue({ id: 'race-1', name: '10K Run' });
      mockParticipantAccounts.provisionIfNeeded.mockResolvedValue({
        email: 'test@test.com',
        password: 'abc123',
      });

      const result = await service.update('reg-1', { paymentStatus: PaymentStatus.PAID });

      expect(mockParticipantAccounts.provisionIfNeeded).toHaveBeenCalledWith(
        'participant-1',
        '10K Run',
      );
      expect(result).toHaveProperty('credentials');
    });
  });

  describe('getAttendance', () => {
    it('returns correct counts by status', async () => {
      mockPrisma.registration.groupBy.mockResolvedValue([
        { status: RegistrationStatus.REGISTERED, _count: { status: 10 } },
        { status: RegistrationStatus.CHECKED_IN, _count: { status: 5 } },
        { status: RegistrationStatus.FINISHED, _count: { status: 3 } },
        { status: RegistrationStatus.DISQUALIFIED, _count: { status: 1 } },
      ]);

      const result = await service.getAttendance('race-1');

      expect(result.totalRegistered).toBe(19);
      expect(result.checkedIn).toBe(9);
      expect(result.notArrived).toBe(10);
    });
  });
});
