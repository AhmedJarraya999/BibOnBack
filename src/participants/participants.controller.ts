import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantsService } from './participants.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a participant' })
  @Post()
  create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  @ApiOperation({ summary: 'Get the participant profile linked to the current user' })
  @Get('me')
  findMe(@CurrentUser() user: AuthUser) {
    return this.participantsService.findByUserId(user.id);
  }

  @ApiOperation({ summary: 'List all participants (paginated, searchable by name or email)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @Get()
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.participantsService.findAll(pagination.page!, pagination.limit!, search);
  }

  @ApiOperation({ summary: 'Get a participant by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a participant' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateParticipantDto) {
    return this.participantsService.update(id, dto);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a participant' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.participantsService.remove(id);
  }
}
