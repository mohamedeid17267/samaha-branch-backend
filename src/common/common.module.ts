import { Global, Module } from '@nestjs/common';
import { MemoryCacheService } from './services/cache.service';
import { WebsiteSyncService } from './services/website-sync.service';

@Global()
@Module({
  providers: [MemoryCacheService, WebsiteSyncService],
  exports: [MemoryCacheService, WebsiteSyncService],
})
export class CommonModule {}
