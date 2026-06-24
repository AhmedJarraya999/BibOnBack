import { Body, Controller, Post, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

class InitiatePaymentDto {
  @IsUrl()
  successUrl: string;

  @IsUrl()
  failUrl: string;
}

class VerifyPaymentDto {
  @IsString()
  paymentId: string;

  @IsString()
  registrationId: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @ApiOperation({ summary: 'Initiate Flouci payment for a registration' })
  @Post('initiate/:registrationId')
  initiate(
    @Param('registrationId') registrationId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(registrationId, dto.successUrl, dto.failUrl);
  }

  @Public()
  @ApiOperation({ summary: 'Verify Flouci payment and mark registration as PAID' })
  @Post('verify')
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto.paymentId, dto.registrationId);
  }
}
