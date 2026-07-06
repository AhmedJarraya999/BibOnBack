import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export enum PaymentMode {
  PREPAID_ONLY = 'PREPAID_ONLY',
  PREPAID_OR_ONSITE = 'PREPAID_OR_ONSITE',
}

export class CreateEventDto {
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;

  // Location
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsString() @IsOptional() addressLine1?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() addressLine2?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() state?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() zipCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() country?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() timezone?: string;

  @ApiProperty() @IsDateString() date: string;

  // Contact
  @ApiPropertyOptional() @IsString() @IsOptional() contactEmail?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() externalUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() externalResultsUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() facebookPageId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() facebookEventId?: string;

  // Registration settings
  @ApiPropertyOptional({ enum: PaymentMode }) @IsEnum(PaymentMode) @IsOptional() paymentMode?: PaymentMode;
  @ApiPropertyOptional() @IsString() @IsOptional() processingFeeMode?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() acceptDonations?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() supportNonBinary?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowPreferNotToSay?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isFirstYear?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() estimatedParticipants?: number;

  // Media
  @ApiPropertyOptional() @IsString() @IsOptional() logoUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bannerUrl?: string;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() pickupLocations?: string[];

  @ApiProperty() @IsString() organizationId: string;
}
