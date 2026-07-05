import { Module } from '@nestjs/common';
import { ReclamationsController } from './reclamations.controller';
import { ReclamationsService } from './reclamations.service';

@Module({
  controllers: [ReclamationsController],
  providers: [ReclamationsService],
})
export class ReclamationsModule {}
