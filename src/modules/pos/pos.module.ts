import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { BranchSaleItem } from '../../database/entities/branch-sale-item.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchSale, BranchSaleItem, BranchInventory, StockMovement]),
    ActivityModule,
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
