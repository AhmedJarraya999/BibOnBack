import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as QRCode from 'qrcode';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { VolunteerPermission } from '../common/constants/volunteer-permissions';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CsvImportService } from './csv-import.service';
import { PublicRegistrationDto } from './dto/public-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationsService } from './registrations.service';

@ApiBearerAuth()
@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
    private readonly csvImportService: CsvImportService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Public pre-registration (no auth required)' })
  @Post('public')
  publicRegister(@Body() dto: PublicRegistrationDto) {
    return this.registrationsService.publicRegister(dto);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Lookup registrations by name or email for distribution' })
  @ApiQuery({ name: 'raceId', required: true })
  @ApiQuery({ name: 'search', required: true })
  @Get('lookup')
  lookup(@Query('raceId') raceId: string, @Query('search') search: string) {
    return this.registrationsService.lookup(raceId, search);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Import participants from Tunisie Evenement CSV' })
  @Post('import/:raceId')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Param('raceId') raceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.csvImportService.importFromCsv(raceId, file.buffer);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Live dashboard stats (status, payment, distribution counts)' })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiQuery({ name: 'raceId', required: false })
  @Get('stats')
  getStats(
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('eventId') eventId?: string,
    @Query('raceId') raceId?: string,
  ) {
    return this.registrationsService.getStats({
      eventId,
      raceId,
      userId: user.id,
      isAdmin: user.role === UserRole.ADMIN,
    });
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a participant for a race' })
  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.create(dto);
  }

  @ApiOperation({ summary: 'List registrations (paginated, filterable by raceId/participantId)' })
  @ApiQuery({ name: 'raceId', required: false })
  @ApiQuery({ name: 'participantId', required: false })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('raceId') raceId?: string,
    @Query('participantId') participantId?: string,
  ) {
    return this.registrationsService.findAll(
      { raceId, participantId, userId: user.id, isAdmin: user.role === UserRole.ADMIN },
      pagination.page!,
      pagination.limit!,
    );
  }

  @ApiOperation({ summary: 'Get a registration by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }

  @ApiOperation({ summary: 'Get QR code PNG for a registration (for check-in scanning)' })
  @Get(':id/qr-code')
  async getQrCode(@Param('id') id: string, @Res() res: Response) {
    await this.registrationsService.findOne(id);
    const png = await QRCode.toBuffer(id, { type: 'png', width: 300 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${id}.png"`);
    res.send(png);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update registration (bib number, payment status)' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) {
    return this.registrationsService.update(id, dto);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.CHECK_IN)
  @ApiOperation({ summary: 'Check in a participant (REGISTERED → CHECKED_IN)' })
  @Post(':id/check-in')
  checkIn(@Param('id') id: string) {
    return this.registrationsService.checkIn(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.FINISH)
  @ApiOperation({ summary: 'Mark a participant as finished (CHECKED_IN → FINISHED)' })
  @Post(':id/finish')
  finish(@Param('id') id: string) {
    return this.registrationsService.finish(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.VOLUNTEER)
  @RequirePermission(VolunteerPermission.DISQUALIFY)
  @ApiOperation({ summary: 'Disqualify a participant' })
  @Post(':id/disqualify')
  disqualify(@Param('id') id: string) {
    return this.registrationsService.disqualify(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a registration' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registrationsService.remove(id);
  }
}
