import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ScanCheckpointDto {
  @ApiProperty({ description: 'Registration ID (from QR code)' })
  @IsString()
  registrationId: string;
}
