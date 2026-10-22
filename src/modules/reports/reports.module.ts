import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { SyncReportsController } from './sync-reports.controller';
import { ReportsService } from './reports.service';
import { BranchSyncedReport } from '../../database/entities/branch-synced-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchSyncedReport])],
  controllers: [ReportsController, SyncReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}


