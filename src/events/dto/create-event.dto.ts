import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'cuid-of-organization' })
  @IsString()
  organizationId: string;
}
