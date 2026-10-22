import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from '../../database/entities/product.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';

import { WebsiteSyncController } from './website-sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, BranchInventory, StockMovement])],
  controllers: [ProductsController, WebsiteSyncController],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
