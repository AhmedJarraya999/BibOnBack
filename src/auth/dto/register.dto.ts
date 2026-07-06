import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;

  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dateOfBirth?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() gender?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() zipCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() country?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hideFromResults?: boolean;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.ORGANIZER })
  @IsEnum(UserRole) @IsOptional() role?: UserRole;
}
