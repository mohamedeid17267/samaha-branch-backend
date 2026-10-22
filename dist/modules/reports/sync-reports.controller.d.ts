import { ReportsService } from './reports.service';
import { IngestBranchReportDto } from './dto/ingest-branch-report.dto';
export declare class SyncReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    ingestReport(dto: IngestBranchReportDto, branchKey?: string): Promise<{
        success: boolean;
        message: string;
        reportId: number;
        data: import("../../database/entities/branch-synced-report.entity").BranchSyncedReport;
    }>;
    getUnifiedReports(startDate?: string, endDate?: string, branchCode?: string): Promise<{
        summary: {
            totalSales: number;
            totalOrders: number;
            totalCash: number;
            totalVisa: number;
            totalExpenses: number;
            totalNetProfit: number;
            branchesCount: number;
        };
        branches: {
            branchCode: string;
            branchName: string;
            daysReported: number;
            totalSales: number;
            totalExpenses: number;
            netProfit: number;
            totalOrders: number;
            totalCash: number;
            totalVisa: number;
            lastSyncDate: string;
            lastStockValue: number;
        }[];
        records: import("../../database/entities/branch-synced-report.entity").BranchSyncedReport[];
    }>;
}
