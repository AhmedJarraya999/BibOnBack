import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { VolunteerPermission } from '../common/constants/volunteer-permissions';
import { UserRole } from '../common/enums/user-role.enum';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';

@ApiBearerAuth()
@ApiTags('Distributions')
@Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.VOLUNTEER)
@Controller('registrations/:registrationId/distributions')
export class DistributionsController {
  constructor(private readonly distributionsService: DistributionsService) {}

  @ApiOperation({ summary: 'Issue an item to a participant (medal, ravito, bib kit, etc.)' })
  @Post()
  issue(@Param('registrationId') registrationId: string, @Body() dto: CreateDistributionDto) {
    return this.distributionsService.issue(registrationId, dto);
  }

  @ApiOperation({ summary: 'List all items issued for a registration' })
  @Get()
  findAll(@Param('registrationId') registrationId: string) {
    return this.distributionsService.findByRegistration(registrationId);
  }

  @ApiOperation({ summary: 'Revoke an item issuance (e.g. issued by mistake)' })
  @Delete(':itemType')
  revoke(@Param('registrationId') registrationId: string, @Param('itemType') itemType: string) {
    return this.distributionsService.revoke(registrationId, itemType);
  }
}
