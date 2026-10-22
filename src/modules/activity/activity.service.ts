import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) { }

  async createNotification(data: {
    userId?: number;
    branchId?: number;
    message: string;
    type?: string;
  }): Promise<Notification> {
    const notif = this.notificationRepository.create({
      userId: data.userId,
      branchId: data.branchId,
      message: data.message,
      type: data.type || 'INFO',
      isRead: false,
    });
    return this.notificationRepository.save(notif);
  }

  async getNotifications(branchId?: number): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('n');

    if (branchId) {
      // Fetch notifications belonging to this branch OR global notifications (where branchId is null)
      queryBuilder.where('n.branchId = :branchId OR n.branchId IS NULL', {
        branchId,
      });
    }

    return queryBuilder.orderBy('n.createdAt', 'DESC').take(50).getMany();
  }

  async markAsRead(id: number): Promise<Notification> {
    const notif = await this.notificationRepository.findOne({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notif.isRead = true;
    return this.notificationRepository.save(notif);
  }

  async markAllAsRead(branchId?: number): Promise<void> {
    const query: any = {};
    if (branchId) {
      query.branchId = branchId;
    }
    await this.notificationRepository.update(query, { isRead: true });
  }

  async createAuditLog(
    username: string,
    action: string,
    details?: string,
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      username,
      action,
      details,
    });
    return this.auditLogRepository.save(log);
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
