import { Module } from '@nestjs/common';

import { ParticipantAccountsService } from './participant-accounts.service';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';

@Module({
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantAccountsService],
  exports: [ParticipantsService, ParticipantAccountsService],
})
export class ParticipantsModule {}
