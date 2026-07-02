import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CheckpointsService } from './checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { ScanCheckpointDto } from './dto/scan-checkpoint.dto';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Checkpoints')
@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a checkpoint for a race' })
  @Post()
  create(@Body() dto: CreateCheckpointDto, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.create(dto, user);
  }

  @ApiOperation({ summary: 'List checkpoints for a race' })
  @Get()
  findByRace(@Query('raceId') raceId: string) {
    return this.checkpointsService.findByRace(raceId);
  }

  @ApiOperation({ summary: 'Get a checkpoint with recent scans' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkpointsService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a checkpoint' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCheckpointDto, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a checkpoint' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.remove(id, user);
  }

  @Roles(UserRole.VOLUNTEER, UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Scan a bib at a checkpoint' })
  @Post(':id/scan')
  scan(@Param('id') id: string, @Body() dto: ScanCheckpointDto, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.scan(id, dto, user.id);
  }

  @ApiOperation({ summary: 'Get all scans for a checkpoint' })
  @Get(':id/scans')
  getScans(@Param('id') id: string) {
    return this.checkpointsService.getScans(id);
  }

  @ApiOperation({ summary: "Get a runner's progress through all checkpoints" })
  @Get('progress/:raceId/:registrationId')
  getRunnerProgress(@Param('raceId') raceId: string, @Param('registrationId') registrationId: string) {
    return this.checkpointsService.getRunnerProgress(raceId, registrationId);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a volunteer to a checkpoint' })
  @Post(':id/volunteers/:volunteerId')
  assignVolunteer(@Param('id') id: string, @Param('volunteerId') volunteerId: string, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.assignVolunteer(id, volunteerId, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a volunteer from a checkpoint' })
  @Delete(':id/volunteers/:volunteerId')
  unassignVolunteer(@Param('id') id: string, @Param('volunteerId') volunteerId: string, @CurrentUser() user: AuthUser) {
    return this.checkpointsService.unassignVolunteer(id, volunteerId, user);
  }
}
