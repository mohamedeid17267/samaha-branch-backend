import { ActivityService } from './activity.service';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    getNotifications(branchId?: string): Promise<import("../../database/entities/notification.entity").Notification[]>;
    markAsRead(id: number): Promise<import("../../database/entities/notification.entity").Notification>;
    markAllAsRead(branchId?: string): Promise<{
        success: boolean;
    }>;
    createNotification(body: {
        userId?: number;
        branchId?: number;
        message: string;
        type?: string;
    }): Promise<import("../../database/entities/notification.entity").Notification>;
    getAuditLogs(): Promise<import("../../database/entities/audit-log.entity").AuditLog[]>;
    createAuditLog(body: {
        username: string;
        action: string;
        details?: string;
    }): Promise<import("../../database/entities/audit-log.entity").AuditLog>;
}
