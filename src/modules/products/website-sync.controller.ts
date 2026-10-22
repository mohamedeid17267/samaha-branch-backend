import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products/sync')
export class WebsiteSyncController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Fast real-time lookup for SKU/Barcode to dynamically fetch stock and website price
   */
  @Get('lookup/:code')
  async lookup(
    @Param('code') code: string,
    @Query('branchId') branchId?: string,
    @Headers('x-sync-secret') secret?: string,
  ) {
    const expectedSecret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';
    if (secret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid sync secret');
    }
    const bId = branchId ? Number(branchId) : 1;
    return this.productsService.syncLookup(code, bId);
  }

  /**
   * Get full catalog with stock and websitePrice for batch reconciliation
   */
  @Get('catalog')
  async catalog(
    @Query('branchId') branchId?: string,
    @Headers('x-sync-secret') secret?: string,
  ) {
    const expectedSecret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';
    if (secret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid sync secret');
    }
    const bId = branchId ? Number(branchId) : 1;
    return this.productsService.syncCatalog(bId);
  }
}
