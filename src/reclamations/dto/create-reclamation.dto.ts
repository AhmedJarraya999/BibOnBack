import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReclamationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  proofDescription?: string;

  @IsOptional()
  @IsString()
  temporaryBib?: string;

  @IsString()
  eventId: string;

  @IsOptional()
  @IsString()
  raceId?: string;
}
