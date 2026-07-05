import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ResolveAction {
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export class ResolveReclamationDto {
  @IsEnum(ResolveAction)
  status: ResolveAction;

  @IsOptional()
  @IsString()
  resolvedNote?: string;
}
