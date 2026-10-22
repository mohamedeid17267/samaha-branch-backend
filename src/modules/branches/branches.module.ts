import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { Branch } from '../../database/entities/branch.entity';
import { BrandRoyaltyLedger } from '../../database/entities/brand-royalty-ledger.entity';
import { Role } from '../../database/entities/role.entity';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BrandRoyaltyLedger, Role]),
    ActivityModule,
    AuthModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
