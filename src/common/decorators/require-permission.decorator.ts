import { SetMetadata } from '@nestjs/common';
import { VolunteerPermission } from '../constants/volunteer-permissions';

export const PERMISSION_KEY = 'volunteer_permission';
export const RequirePermission = (permission: VolunteerPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
