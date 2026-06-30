import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { RegistrationsService } from '../registrations/registrations.service';
import { CreateRaceDto } from './dto/create-race.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { RacesService } from './races.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Races')
@Controller('races')
export class RacesController {
  constructor(
    private readonly racesService: RacesService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a race within an event' })
  @Post()
  create(@Body() dto: CreateRaceDto, @CurrentUser() user: AuthUser) {
    return this.racesService.create(dto, user);
  }

  @ApiOperation({ summary: 'List all races (paginated, filterable by eventId and name)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by race name' })
  @ApiQuery({ name: 'eventId', required: false, description: 'Filter by event' })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
  ) {
    return this.racesService.findAll(pagination.page!, pagination.limit!, user, { search, eventId });
  }

  @ApiOperation({ summary: 'Get a race by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.racesService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a race' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRaceDto, @CurrentUser() user: AuthUser) {
    return this.racesService.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Get race-day attendance count' })
  @Get(':raceId/attendance')
  getAttendance(@Param('raceId') raceId: string) {
    return this.registrationsService.getAttendance(raceId);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Look up a registration by bib number' })
  @Get(':raceId/registrations/by-bib/:bibNumber')
  findByBib(@Param('raceId') raceId: string, @Param('bibNumber') bibNumber: string) {
    return this.registrationsService.findByBib(raceId, bibNumber);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a race' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.racesService.remove(id, user);
  }
}
