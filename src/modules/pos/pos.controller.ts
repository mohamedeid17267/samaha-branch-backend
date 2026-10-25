import { Controller, Post, Get, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sales')
  @UseGuards(BranchScopeGuard)
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @GetUser() user: User,
    @Headers('x-idempotency-key') idempotencyKeyHeader?: string,
  ) {
    if (idempotencyKeyHeader && !createSaleDto.idempotencyKey) {
      createSaleDto.idempotencyKey = idempotencyKeyHeader;
    }
    return this.posService.createSale(createSaleDto, user.username);
  }

  @Post('sales/return')
  @UseGuards(BranchScopeGuard)
  async returnSale(
    @Body() returnDto: any,
    @GetUser() user: User,
  ) {
    return this.posService.processSaleReturn(returnDto, user.username);
  }

  @Post('sync-batch')
  async syncBatch(
    @Body() batchData: any,
    @GetUser() user: User,
  ) {
    return this.posService.syncBatch(batchData, user?.username || 'SyncAgent');
  }

  @Get('sales')
  @UseGuards(BranchScopeGuard)
  async getSales(
    @Query('branchId') branchId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.posService.getSales(
      branchId ? Number(branchId) : undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 200,
      startDate,
      endDate,
    );
  }

  @Get('treasury-report')
  @UseGuards(BranchScopeGuard)
  async getTreasuryReport(
    @Query('branchId') branchId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.posService.getTreasuryReport(
      branchId ? Number(branchId) : 1,
      startDate,
      endDate,
    );
  }
}
