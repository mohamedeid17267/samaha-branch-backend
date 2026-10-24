import { Global, Module } from '@nestjs/common';
import { MemoryCacheService } from './services/cache.service';
import { WebsiteSyncService } from './services/website-sync.service';
import { ReconciliationService } from './services/reconciliation.service';

@Global()
@Module({
  providers: [MemoryCacheService, WebsiteSyncService, ReconciliationService],
  exports: [MemoryCacheService, WebsiteSyncService, ReconciliationService],
})
export class CommonModule {}
