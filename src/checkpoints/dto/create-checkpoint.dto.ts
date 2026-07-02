import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsOptional, IsDateString, IsArray, IsNumber, Min } from 'class-validator';
import { CheckpointType } from '../../../../generated/prisma';

export class CreateCheckpointDto {
  @ApiProperty()
  @IsString()
  raceId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ enum: CheckpointType })
  @IsOptional()
  @IsEnum(CheckpointType)
  type?: CheckpointType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  cutoffTime?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
