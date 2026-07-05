import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum IncidentSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SERIOUS = 'SERIOUS',
  CRITICAL = 'CRITICAL',
}

export class CreateIncidentDto {
  @IsString()
  registrationId: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;
}
