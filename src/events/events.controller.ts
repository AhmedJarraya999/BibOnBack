import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an event' })
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.eventsService.create(dto, user);
  }

  @ApiOperation({ summary: 'List all events (paginated)' })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.eventsService.findAll(pagination.page!, pagination.limit!, user, organizationId);
  }

  @ApiOperation({ summary: 'Get an event by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an event' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: AuthUser) {
    return this.eventsService.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an event' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.remove(id, user);
  }
}
