import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
  Patch,
  Req,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordChargeDto } from './dto/record-charge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {

  @Delete('payments/:ledgerType/:id')
  @Roles(RoleEnum.HQ_ADMIN)
  async deletePayment(
    @Param('ledgerType') ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT',
    @Param('id') id: string,
    @Req() req
  ) {
    await this.financeService.deletePayment(ledgerType, +id, req.user.username);
    return { message: 'Deleted successfully' };
  }

  @Patch('payments/:ledgerType/:id')
  @Roles(RoleEnum.HQ_ADMIN)
  async updatePayment(
    @Param('ledgerType') ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT',
    @Param('id') id: string,
    @Body() body: any,
    @Req() req
  ) {
    await this.financeService.updatePayment(ledgerType, +id, body, req.user.username);
    return { message: 'Updated successfully' };
  }

  constructor(private readonly financeService: FinanceService) {}

  @Post('payments')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async recordPayment(
    @Body() paymentDto: RecordPaymentDto,
    @GetUser() user: User,
  ) {
    return this.financeService.recordPayment(paymentDto, user.username);
  }

  @Post('royalty/charge')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async recordRoyaltyCharge(
    @Body() chargeDto: RecordChargeDto,
    @GetUser() user: User,
  ) {
    return this.financeService.recordRoyaltyCharge(chargeDto, user.username);
  }

  @Get('royalty/ledger/:branchId')
  @UseGuards(BranchScopeGuard)
  async getRoyaltyLedger(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getRoyaltyLedger(
      branchId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('inventory-debt/ledger/:branchId')
  @UseGuards(BranchScopeGuard)
  async getInventoryDebtLedger(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getInventoryDebtLedger(
      branchId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('summaries')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async getAllBranchFinancialSummaries() {
    return this.financeService.getAllBranchFinancialSummaries();
  }

  @Get('payments')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async getAllPayments() {
    return this.financeService.getAllPayments();
  }

  @Get('summary/:branchId')
  @UseGuards(BranchScopeGuard)
  async getBranchFinancialSummary(
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.financeService.getBranchFinancialSummary(branchId);
  }

  @Get('liabilities')
  @Roles(RoleEnum.HQ_ADMIN)
  async getLiabilities() {
    return this.financeService.getLiabilities();
  }

  @Post('liabilities')
  @Roles(RoleEnum.HQ_ADMIN)
  async addLiability(@Body() data: any, @GetUser() user: User) {
    return this.financeService.addLiability(data, user.username);
  }

  @Post('liabilities/:id')
  @Roles(RoleEnum.HQ_ADMIN)
  async updateLiability(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.financeService.updateLiability(id, data);
  }

  @Post('liabilities/:id/delete')
  @Roles(RoleEnum.HQ_ADMIN)
  async deleteLiability(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.deleteLiability(id);
  }

  // Branch Expenses Endpoints
  @Get('branch-expenses')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async getAllBranchExpenses() {
    return this.financeService.getBranchExpenses();
  }

  @Get('branch-expenses/:branchId')
  @UseGuards(BranchScopeGuard)
  async getBranchExpenses(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.financeService.getBranchExpenses(branchId);
  }

  @Post('branch-expenses/:branchId')
  @UseGuards(BranchScopeGuard)
  async addBranchExpense(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() data: any,
  ) {
    return this.financeService.addBranchExpense(branchId, data);
  }

  // Branch Daily Revenues Endpoints
  @Get('branch-revenues')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async getAllBranchDailyRevenues() {
    return this.financeService.getBranchDailyRevenues();
  }

  @Get('branch-revenues/:branchId')
  @UseGuards(BranchScopeGuard)
  async getBranchDailyRevenues(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.financeService.getBranchDailyRevenues(branchId);
  }

  @Post('branch-revenues/:branchId')
  @UseGuards(BranchScopeGuard)
  async addBranchDailyRevenue(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() data: any,
  ) {
    return this.financeService.addBranchDailyRevenue(branchId, data);
  }
}

