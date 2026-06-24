import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateVolunteerDto {
  @ApiProperty({ example: 'cuid-of-user' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'cuid-of-event' })
  @IsString()
  eventId: string;

  @ApiProperty({ example: ['CHECK_IN', 'DISTRIBUTE_MEDALS'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];
}
