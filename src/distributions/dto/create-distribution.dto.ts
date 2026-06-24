import { IsEnum, IsOptional, IsString } from 'class-validator';

import { DistributionItemType } from '../../../../generated/prisma';

export { DistributionItemType };

export class CreateDistributionDto {
  @IsEnum(DistributionItemType)
  itemType: DistributionItemType;

  @IsOptional()
  @IsString()
  issuedByVolunteerId?: string;
}
