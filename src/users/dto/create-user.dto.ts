import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(UserRole) role: UserRole;

  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsString() @IsOptional() phone?: string;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() zipCode?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() country?: string;
  @IsBoolean() @IsOptional() hideFromResults?: boolean;
}
