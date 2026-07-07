import { Module } from '@nestjs/common';
import { DistributionPointsController } from './distribution-points.controller';
import { DistributionPointsService } from './distribution-points.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [DistributionPointsController],
  providers: [DistributionPointsService],
  exports: [DistributionPointsService],
})
export class DistributionPointsModule {}
