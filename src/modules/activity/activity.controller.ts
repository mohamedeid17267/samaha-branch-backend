import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('notifications')
  async getNotifications(@Query('branchId') branchId?: string) {
    const bId = branchId ? parseInt(branchId, 10) : undefined;
    return this.activityService.getNotifications(bId);
  }

  @Patch('notifications/:id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.activityService.markAsRead(id);
  }

  @Post('notifications/mark-all-read')
  async markAllAsRead(@Query('branchId') branchId?: string) {
    const bId = branchId ? parseInt(branchId, 10) : undefined;
    await this.activityService.markAllAsRead(bId);
    return { success: true };
  }

  @Post('notifications')
  async createNotification(
    @Body()
    body: {
      userId?: number;
      branchId?: number;
      message: string;
      type?: string;
    },
  ) {
    return this.activityService.createNotification(body);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.activityService.getAuditLogs();
  }

  @Post('audit-logs')
  async createAuditLog(
    @Body() body: { username: string; action: string; details?: string },
  ) {
    return this.activityService.createAuditLog(
      body.username,
      body.action,
      body.details,
    );
  }
}
