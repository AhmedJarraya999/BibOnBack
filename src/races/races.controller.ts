import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FindRacesQueryDto } from './dto/find-races-query.dto';
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

  @Public()
  @ApiOperation({ summary: 'List all races (paginated, filterable by eventId and name)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by race name' })
  @ApiQuery({ name: 'eventId', required: false, description: 'Filter by event' })
  @Get()
  findAll(
    @Query() query: FindRacesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.racesService.findAll(query.page!, query.limit!, user ?? null, { search: query.search, eventId: query.eventId });
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

  @Public()
  @ApiOperation({ summary: 'Stream the GPX file for a race' })
  @Get(':id/gpx')
  async streamGpx(@Param('id') id: string, @Res() res: Response) {
    const race = await this.racesService.findOne(id);
    if (!race.gpxUrl) throw new NotFoundException('No GPX file for this race');
    const filename = (race.gpxUrl as string).split('/').pop()!;
    const filePath = join(process.cwd(), 'uploads', 'gpx', filename);
    if (!existsSync(filePath)) throw new NotFoundException('GPX file not found on disk');
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    createReadStream(filePath).pipe(res);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload a GPX route file for a race' })
  @ApiConsumes('multipart/form-data')
  @Post(':id/gpx')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads', 'gpx'),
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/gpx+xml' || file.originalname.endsWith('.gpx')) {
        cb(null, true);
      } else {
        cb(new Error('Only .gpx files are allowed'), false);
      }
    },
  }))
  uploadGpx(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.racesService.uploadGpx(id, file.filename, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove the GPX route file from a race' })
  @Delete(':id/gpx')
  removeGpx(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.racesService.removeGpx(id, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a race' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.racesService.remove(id, user);
  }
}
