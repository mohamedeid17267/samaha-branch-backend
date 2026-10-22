import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { InventoryDebtLedger } from '../../database/entities/inventory-debt-ledger.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      OrderItem,
      Product,
      BranchInventory,
      InventoryDebtLedger,
      StockMovement,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
