import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(RoleEnum.HQ_ADMIN)
  async create(
    @Body() createBranchDto: CreateBranchDto,
    @GetUser() user: User,
  ) {
    return this.branchesService.create(createBranchDto, user.username);
  }

  @Patch(':id')
  @Roles(RoleEnum.HQ_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any,
    @GetUser() user: User,
  ) {
    return this.branchesService.update(id, updateData, user.username);
  }

  @Get()
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.branchesService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  @UseGuards(BranchScopeGuard) // Ensures a Branch_Manager can only fetch their own branch!
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findOne(id);
  }

  @Delete(':id')
  @Roles(RoleEnum.HQ_ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.branchesService.remove(id);
    return { success: true, message: 'Branch deleted successfully' };
  }
}
