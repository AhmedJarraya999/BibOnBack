import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../enums/user-role.enum';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { VolunteerPermission } from '../constants/volunteer-permissions';

@Injectable()
export class VolunteerPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<VolunteerPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // no permission required on this endpoint — pass through
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: UserRole };

    // ADMINs and ORGANIZERs always bypass permission checks
    if (user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER) return true;

    // for volunteers, resolve the eventId from the registration in params
    const registrationId = request.params['id'] ?? request.params['registrationId'];
    if (!registrationId) return false;

    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { race: true },
    });
    if (!registration) return false;

    const eventId = registration.race.eventId;

    const volunteer = await this.prisma.volunteer.findUnique({
      where: { userId_eventId: { userId: user.id, eventId } },
    });

    if (!volunteer) {
      throw new ForbiddenException('You are not a volunteer for this event');
    }

    if (!volunteer.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `You do not have the "${requiredPermission}" permission for this event`,
      );
    }

    return true;
  }
}
