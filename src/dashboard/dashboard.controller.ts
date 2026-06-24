import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';

interface AuthUser { id: string; }

@ApiBearerAuth()
@ApiTags('Dashboard')
@Roles(UserRole.PARTICIPANT)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get upcoming races for the logged-in participant' })
  @Get('upcoming-races')
  upcomingRaces(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getUpcomingRaces(user.id);
  }

  @ApiOperation({ summary: 'Get race results for the logged-in participant' })
  @Get('results')
  results(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getResults(user.id);
  }

  @ApiOperation({ summary: 'Get performance stats with percentile ranking' })
  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getStats(user.id);
  }
}
