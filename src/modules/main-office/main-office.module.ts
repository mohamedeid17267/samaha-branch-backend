import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainOfficeController } from './main-office.controller';
import { MainOfficeService } from './main-office.service';
import { MainOfficeExpense } from '../../database/entities/main-office-expense.entity';
import { ImportContainer } from '../../database/entities/import-container.entity';
import { MainOfficeInventory } from '../../database/entities/main-office-inventory.entity';
import { MainOfficeTransaction } from '../../database/entities/main-office-transaction.entity';
import { Product } from '../../database/entities/product.entity';
import { ActivityModule } from '../activity/activity.module';

import { Branch } from '../../database/entities/branch.entity';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { BranchDailyRevenue } from '../../database/entities/branch-daily-revenue.entity';

@Module({
  imports: [
    ActivityModule,
    TypeOrmModule.forFeature([
      MainOfficeExpense,
      ImportContainer,
      MainOfficeInventory,
      MainOfficeTransaction,
      Product,
      Branch,
      BranchSale,
      BranchInventory,
      Customer,
      Supplier,
      BranchExpense,
      BranchDailyRevenue,
    ]),
  ],
  controllers: [MainOfficeController],
  providers: [MainOfficeService],
})
export class MainOfficeModule {}
