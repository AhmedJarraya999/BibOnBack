import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { VolunteerPermission } from '../common/constants/volunteer-permissions';
import { MedicalService } from './medical.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@ApiBearerAuth()
@ApiTags('Medical')
@Controller('medical')
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.MEDICAL)
  @Get('lookup')
  lookupByBib(
    @Query('raceId') raceId: string,
    @Query('bib') bib: string,
  ) {
    return this.medicalService.lookupByBib(raceId, bib);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.MEDICAL)
  @Get('registration/:id')
  lookupById(@Param('id') id: string) {
    return this.medicalService.lookupById(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.MEDICAL)
  @Post('incidents')
  logIncident(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.medicalService.logIncident(dto, user?.sub);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.MEDICAL)
  @Get('incidents')
  findIncidents(@Query('raceId') raceId: string) {
    return this.medicalService.findIncidents(raceId);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Delete('incidents/:id')
  deleteIncident(@Param('id') id: string) {
    return this.medicalService.deleteIncident(id);
  }
}
