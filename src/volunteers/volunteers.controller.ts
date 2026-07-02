import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { InviteVolunteerDto } from './dto/invite-volunteer.dto';
import { VolunteersService } from './volunteers.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Volunteers')
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Invite a volunteer by email (creates account if needed)' })
  @Post('invite')
  invite(@Body() dto: InviteVolunteerDto, @CurrentUser() user: AuthUser) {
    return this.volunteersService.invite(dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a volunteer to an event' })
  @Post()
  create(@Body() dto: CreateVolunteerDto, @CurrentUser() user: AuthUser) {
    return this.volunteersService.create(dto, user);
  }

  @ApiOperation({ summary: 'List volunteers (paginated, filterable by eventId/userId)' })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('eventId') eventId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.volunteersService.findAll({ eventId, userId }, pagination.page!, pagination.limit!);
  }

  @ApiOperation({ summary: 'Get a volunteer assignment by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.volunteersService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update volunteer permissions' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVolunteerDto, @CurrentUser() user: AuthUser) {
    return this.volunteersService.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a volunteer from an event' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.volunteersService.remove(id, user);
  }
}
