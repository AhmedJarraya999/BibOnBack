import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Marathon Club Tunis' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/|data:image\/)/, { message: 'logoUrl must be a URL or image data' })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'facebook must be a valid URL' })
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'instagram must be a valid URL' })
  instagram?: string;
}
