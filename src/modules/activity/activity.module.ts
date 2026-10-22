import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { Notification } from '../../database/entities/notification.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, AuditLog])],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
