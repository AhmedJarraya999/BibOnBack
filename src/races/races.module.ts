import { Module } from '@nestjs/common';

import { RegistrationsModule } from '../registrations/registrations.module';
import { RacesController } from './races.controller';
import { RacesService } from './races.service';

@Module({
  imports: [RegistrationsModule],
  controllers: [RacesController],
  providers: [RacesService],
  exports: [RacesService],
})
export class RacesModule {}
