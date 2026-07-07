import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DistributionPointsService } from './distribution-points.service';
import { CreateDistributionPointDto } from './dto/create-distribution-point.dto';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Distribution Points')
@Controller('distribution-points')
export class DistributionPointsController {
  constructor(private readonly service: DistributionPointsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a distribution point for an event' })
  @Post()
  create(@Body() dto: CreateDistributionPointDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List distribution points for an event' })
  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.service.findByEvent(eventId);
  }

  @Public()
  @ApiOperation({ summary: 'Get distribution point by token (magic link)' })
  @Get('token/:token')
  findByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a distribution point' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateDistributionPointDto>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate access token' })
  @Post(':id/regenerate-token')
  regenerateToken(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.regenerateToken(id, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a distribution point' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
