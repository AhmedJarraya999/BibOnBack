import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ResolveReclamationDto } from './dto/resolve-reclamation.dto';
import { ReclamationsService } from './reclamations.service';

@ApiBearerAuth()
@ApiTags('Reclamations')
@Controller('reclamations')
export class ReclamationsController {
  constructor(private readonly reclamationsService: ReclamationsService) {}

  @Public()
  @Post()
  create(
    @Body() dto: CreateReclamationDto,
    @CurrentUser() user?: { id: string; role: UserRole },
  ) {
    return this.reclamationsService.create(dto, user?.id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Get()
  findAll(
    @Query('eventId') eventId?: string,
    @Query('raceId') raceId?: string,
    @Query('status') status?: string,
  ) {
    return this.reclamationsService.findAll(eventId, raceId, status);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveReclamationDto) {
    return this.reclamationsService.resolve(id, dto);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reclamationsService.remove(id);
  }
}
