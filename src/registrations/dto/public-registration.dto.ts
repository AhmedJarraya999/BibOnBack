import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class PublicRegistrationDto {
  @ApiProperty({ example: 'Ahmed Jarraya' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1995-06-15' })
  @IsDateString()
  birthdate: string;

  @ApiProperty({ example: 'M', enum: ['M', 'F'] })
  @IsEnum(['M', 'F'])
  gender: string;

  @ApiProperty({ example: 'cuid-of-race' })
  @IsString()
  raceId: string;

  @ApiPropertyOptional({ example: '+21698000000' })
  @IsOptional()
  @IsString()
  phone?: string;
}
