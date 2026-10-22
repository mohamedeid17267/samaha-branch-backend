import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { BrandRoyaltyLedger } from '../../database/entities/brand-royalty-ledger.entity';
import { InventoryDebtLedger } from '../../database/entities/inventory-debt-ledger.entity';
import { Branch } from '../../database/entities/branch.entity';
import { Liability } from '../../database/entities/liability.entity';
import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { BranchDailyRevenue } from '../../database/entities/branch-daily-revenue.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BrandRoyaltyLedger, 
      InventoryDebtLedger, 
      Branch, 
      Liability, 
      BranchExpense, 
      BranchDailyRevenue,
      CustomerDebtLedger
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
