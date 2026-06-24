import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'cuid-of-event' })
  @IsString()
  eventId: string;
}
