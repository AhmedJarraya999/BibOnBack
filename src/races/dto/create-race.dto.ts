import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';

export class CreateRaceDto {
  @ApiProperty({ example: '10K Run' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 10, description: 'Distance in kilometers' })
  @IsNumber()
  @IsPositive()
  distance: number;

  @ApiProperty({ example: '2026-10-15T08:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: 25.000, description: 'Participation fee in TND' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fee?: number;

  @ApiProperty({ example: 'cuid-of-event' })
  @IsString()
  eventId: string;
}
