import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
export declare class ActivityService {
    private notificationRepository;
    private auditLogRepository;
    constructor(notificationRepository: Repository<Notification>, auditLogRepository: Repository<AuditLog>);
    createNotification(data: {
        userId?: number;
        branchId?: number;
        message: string;
        type?: string;
    }): Promise<Notification>;
    getNotifications(branchId?: number): Promise<Notification[]>;
    markAsRead(id: number): Promise<Notification>;
    markAllAsRead(branchId?: number): Promise<void>;
    createAuditLog(username: string, action: string, details?: string): Promise<AuditLog>;
    getAuditLogs(): Promise<AuditLog[]>;
}
