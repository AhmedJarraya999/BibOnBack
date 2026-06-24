import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../enums/user-role.enum';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { VolunteerPermissionsGuard } from './volunteer-permissions.guard';

const mockReflector = { getAllAndOverride: jest.fn() };

const mockPrisma = {
  registration: { findUnique: jest.fn() },
  volunteer: { findUnique: jest.fn() },
};

function makeContext(user: any, params: Record<string, string> = {}) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('VolunteerPermissionsGuard', () => {
  let guard: VolunteerPermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new VolunteerPermissionsGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('passes when no permission is required on the endpoint', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(makeContext({ id: 'u-1', role: UserRole.VOLUNTEER }));
    expect(result).toBe(true);
  });

  it('passes for ADMIN regardless of permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('CHECK_IN');
    const result = await guard.canActivate(makeContext({ id: 'u-1', role: UserRole.ADMIN }, { id: 'reg-1' }));
    expect(result).toBe(true);
    expect(mockPrisma.registration.findUnique).not.toHaveBeenCalled();
  });

  it('passes for ORGANIZER regardless of permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('CHECK_IN');
    const result = await guard.canActivate(makeContext({ id: 'u-1', role: UserRole.ORGANIZER }, { id: 'reg-1' }));
    expect(result).toBe(true);
  });

  it('passes for VOLUNTEER with correct permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('CHECK_IN');
    mockPrisma.registration.findUnique.mockResolvedValue({
      id: 'reg-1',
      race: { eventId: 'event-1' },
    });
    mockPrisma.volunteer.findUnique.mockResolvedValue({
      id: 'v-1',
      permissions: ['CHECK_IN', 'DISTRIBUTE'],
    });

    const result = await guard.canActivate(
      makeContext({ id: 'u-1', role: UserRole.VOLUNTEER }, { id: 'reg-1' }),
    );
    expect(result).toBe(true);
  });

  it('throws ForbiddenException when volunteer lacks required permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('FINISH');
    mockPrisma.registration.findUnique.mockResolvedValue({
      id: 'reg-1',
      race: { eventId: 'event-1' },
    });
    mockPrisma.volunteer.findUnique.mockResolvedValue({
      id: 'v-1',
      permissions: ['CHECK_IN'],
    });

    await expect(
      guard.canActivate(makeContext({ id: 'u-1', role: UserRole.VOLUNTEER }, { id: 'reg-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is not a volunteer for the event', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('CHECK_IN');
    mockPrisma.registration.findUnique.mockResolvedValue({
      id: 'reg-1',
      race: { eventId: 'event-1' },
    });
    mockPrisma.volunteer.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext({ id: 'u-1', role: UserRole.VOLUNTEER }, { id: 'reg-1' })),
    ).rejects.toThrow(ForbiddenException);
  });
});
