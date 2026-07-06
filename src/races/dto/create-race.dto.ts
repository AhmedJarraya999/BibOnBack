import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';

export class CreateRaceDto {
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() type?: string;
  @ApiProperty() @IsNumber() @IsPositive() distance: number;
  @ApiProperty() @IsDateString() startTime: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endTime?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() fee?: number;
  @ApiProperty() @IsString() eventId: string;
}
