import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { IngestBranchReportDto } from './dto/ingest-branch-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('sync/reports')
export class SyncReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Endpoint called by branch systems (samaha-branch, etc.) to push daily/periodic unified reports
   */
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestReport(
    @Body() dto: IngestBranchReportDto,
    @Headers('x-branch-key') branchKey?: string,
  ) {
    return this.reportsService.ingestBranchReport(dto);
  }

  /**
   * Endpoint for HQ Admin Dashboard to view unified aggregated metrics across all branches
   */
  @Get('unified')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async getUnifiedReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchCode') branchCode?: string,
  ) {
    return this.reportsService.getUnifiedBranchReports(startDate, endDate, branchCode);
  }
}
