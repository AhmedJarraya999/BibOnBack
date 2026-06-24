import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateVolunteerDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];
}
