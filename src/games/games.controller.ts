import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { VolunteerPermission } from '../common/constants/volunteer-permissions';
import { UserRole } from '../common/enums/user-role.enum';
import { GamesService } from './games.service';

interface AuthUser { id: string; role: UserRole; name?: string; }

@ApiBearerAuth()
@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // ── Volunteer endpoints ─────────────────────────────────────────────────────

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Create a game session' })
  @Post()
  create(
    @Body() body: { eventId: string; title: string; type: 'TAMBOLA' | 'QUIZ'; questions?: any[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.gamesService.create(body, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'List game sessions for an event' })
  @Get()
  findAll(@Query('eventId') eventId: string) {
    return this.gamesService.findAll(eventId);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Update game status' })
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'WAITING' | 'ACTIVE' | 'FINISHED' }) {
    return this.gamesService.updateStatus(id, body.status);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Set quiz questions' })
  @Patch(':id/questions')
  setQuestions(@Param('id') id: string, @Body() body: { questions: any[] }) {
    return this.gamesService.setQuestions(id, body.questions);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Call next tambola number' })
  @Post(':id/call')
  callNumber(@Param('id') id: string, @Body() body: { number?: number }) {
    return this.gamesService.callNumber(id, body?.number);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Advance to next quiz question' })
  @Post(':id/next-question')
  nextQuestion(@Param('id') id: string) {
    return this.gamesService.nextQuestion(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Verify or reject a tambola claim' })
  @Patch('claims/:claimId')
  verifyClaim(@Param('claimId') claimId: string, @Body() body: { verified: boolean }) {
    return this.gamesService.verifyClaim(claimId, body.verified);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.GAMES)
  @ApiOperation({ summary: 'Quiz leaderboard' })
  @Get(':id/leaderboard')
  quizLeaderboard(@Param('id') id: string) {
    return this.gamesService.quizLeaderboard(id);
  }

  // ── Public / Participant endpoints ─────────────────────────────────────────

  @Public()
  @ApiOperation({ summary: 'Get current game state (for polling)' })
  @Get(':id/state')
  getState(@Param('id') id: string) {
    return this.gamesService.getState(id);
  }

  @Roles(UserRole.PARTICIPANT)
  @ApiOperation({ summary: 'Get or generate my tambola card' })
  @Get(':id/card')
  getMyCard(@Param('id') id: string, @CurrentUser() user: AuthUser & { participantId?: string }) {
    return this.gamesService.getMyCard(id, user.id, user.name ?? 'Participant');
  }

  @Roles(UserRole.PARTICIPANT)
  @ApiOperation({ summary: 'Claim a tambola prize (ONE_LINE / TWO_LINES / FULL_HOUSE)' })
  @Post(':id/claim')
  claimTambola(
    @Param('id') id: string,
    @Body() body: { claimType: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.gamesService.claimTambola(id, body.claimType, user.id, user.name ?? 'Participant');
  }

  @Roles(UserRole.PARTICIPANT)
  @ApiOperation({ summary: 'Submit a quiz answer' })
  @Post(':id/answer')
  submitAnswer(
    @Param('id') id: string,
    @Body() body: { questionIndex: number; selectedOption: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.gamesService.submitQuizAnswer(id, body.questionIndex, body.selectedOption, user.id, user.name ?? 'Participant');
  }

  @Roles(UserRole.PARTICIPANT)
  @ApiOperation({ summary: 'Get active games for a list of eventIds' })
  @Post('my-events')
  getGamesForEvents(@Body() body: { eventIds: string[] }) {
    return this.gamesService.getGamesForEvents(body.eventIds);
  }
}
