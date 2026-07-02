import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum PaymentMode {
  PREPAID_ONLY = 'PREPAID_ONLY',
  PREPAID_OR_ONSITE = 'PREPAID_OR_ONSITE',
}

export class CreateEventDto {
  @ApiProperty({ example: 'Marathon de Tunis 2026' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Tunis, Tunisia' })
  @IsString()
  location: string;

  @ApiProperty({ example: '2026-10-15T08:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: PaymentMode, default: PaymentMode.PREPAID_OR_ONSITE })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({ example: 'data:image/png;base64,...' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 'cuid-of-organization' })
  @IsString()
  organizationId: string;
}
