import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsIn, IsString, MinLength } from 'class-validator';

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
}
