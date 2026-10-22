import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MainOfficeService } from './main-office.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('main-office')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
export class MainOfficeController {
  constructor(private readonly service: MainOfficeService) {}

  @Get('expenses')
  getExpenses() {
    return this.service.getExpenses();
  }

  @Post('expenses')
  addExpense(@Body() data: any, @GetUser() user: User) {
    return this.service.addExpense(data, user.username);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: number) {
    return this.service.deleteExpense(id);
  }

  @Get('containers')
  getContainers() {
    return this.service.getContainers();
  }

  @Post('containers')
  addContainer(@Body() data: any) {
    return this.service.addContainer(data);
  }

  @Delete('containers/:id')
  deleteContainer(@Param('id') id: number) {
    return this.service.deleteContainer(id);
  }

  @Get('inventory')
  getInventory(@Query('containerId') containerId?: number) {
    return this.service.getInventory(containerId);
  }

  @Post('inventory/receive')
  receiveGoods(@Body() data: { containerId: number, productId: number, quantity: number, costPrice?: number, notes?: string }) {
    return this.service.receiveGoods(data.containerId, data.productId, data.quantity, data.costPrice, data.notes);
  }

  @Post('inventory/withdraw')
  withdrawGoods(@Body() data: { containerId: number, productId: number, quantity: number, notes?: string }) {
    return this.service.withdrawGoods(data.containerId, data.productId, data.quantity, data.notes);
  }

  @Post('inventory/audit')
  auditInventory(@Body() data: { containerId: number, productId: number, actualQuantity: number, notes?: string }) {
    return this.service.auditInventory(data.containerId, data.productId, data.actualQuantity, data.notes);
  }

  @Get('transactions')
  getTransactions() {
    return this.service.getTransactions();
  }

  @Get('branches-overview')
  getBranchesOverview() {
    return this.service.getBranchesOverview();
  }

  @Get('branches/:id/deep-dive')
  getBranchDeepDive(@Param('id') id: string) {
    return this.service.getBranchDeepDive(Number(id));
  }
}
