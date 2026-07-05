import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateParticipantDto {
  @ApiProperty({ example: 'Ali Ben Salem' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '1990-05-20T00:00:00.000Z' })
  @IsDateString()
  birthdate: string;

  @ApiProperty({ enum: ['male', 'female', 'other'], example: 'male' })
  @IsIn(['male', 'female', 'other'])
  gender: string;

  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalConditions?: string;
}
