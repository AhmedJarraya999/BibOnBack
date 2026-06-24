import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

interface AuthUser { id: string; role: UserRole; }

@ApiBearerAuth()
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an organization' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'List all organizations (paginated)' })
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.organizationsService.findAll(pagination.page!, pagination.limit!);
  }

  @ApiOperation({ summary: 'Get an organization by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an organization' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.organizationsService.update(id, dto, user);
  }

  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an organization' })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.remove(id, user);
  }
}
