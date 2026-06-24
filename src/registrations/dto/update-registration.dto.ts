import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class UpdateRegistrationDto {
  @IsOptional()
  @IsString()
  bibNumber?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsISO8601()
  finishTime?: string;
}
