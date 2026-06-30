import { Module } from '@nestjs/common';

import { ParticipantsModule } from '../participants/participants.module';
import { CsvImportService } from './csv-import.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [ParticipantsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, CsvImportService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
