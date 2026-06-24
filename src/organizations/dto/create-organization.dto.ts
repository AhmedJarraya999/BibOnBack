import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Marathon Club Tunis' })
  @IsString()
  @MinLength(2)
  name: string;
}
