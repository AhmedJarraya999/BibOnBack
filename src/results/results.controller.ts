import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ResultsService } from './results.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Results')
@Controller()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Compute rankings for a race from FINISHED registrations' })
  @Post('races/:raceId/results/compute')
  compute(@Param('raceId') raceId: string, @CurrentUser() user: AuthUser) {
    return this.resultsService.computeForRace(raceId, user);
  }

  @ApiOperation({ summary: 'Get results for a race' })
  @Get('races/:raceId/results')
  findByRace(@Param('raceId') raceId: string) {
    return this.resultsService.findByRace(raceId);
  }

  @ApiOperation({ summary: 'Get results for a participant' })
  @Get('participants/:participantId/results')
  findByParticipant(@Param('participantId') participantId: string) {
    return this.resultsService.findByParticipant(participantId);
  }
}
