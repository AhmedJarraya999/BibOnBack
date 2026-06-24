import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty({ example: 'cuid-of-participant' })
  @IsString()
  participantId: string;

  @ApiProperty({ example: 'cuid-of-race' })
  @IsString()
  raceId: string;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  bibNumber?: string;
}
