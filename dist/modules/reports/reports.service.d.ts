import { Repository, DataSource } from 'typeorm';
import { BranchSyncedReport } from '../../database/entities/branch-synced-report.entity';
export declare class ReportsService {
    private branchReportRepo;
    private dataSource;
    constructor(branchReportRepo: Repository<BranchSyncedReport>, dataSource: DataSource);
    getFinancialSummary(startDate?: string, endDate?: string): Promise<{
        hqSales: number;
        hqPaid: number;
        hqDebts: number;
        posSales: number;
        branchDebts: number;
        customerDebts: number;
        totalOutstandingDebts: number;
        assemblyTotalRevenues: number;
        assemblyRevenues: number;
        assemblyDebts: number;
        inventoryTotalRevenues: number;
        inventoryRevenues: number;
        inventoryDebts: number;
        customerTotalRevenues: number;
        customerRevenues: number;
        customerDebtsCalculated: number;
    }>;
    getInventorySummary(): Promise<{
        hqInventoryValue: number;
        branchInventoryValue: number;
        totalInventoryValue: number;
        lowStockItemsCount: number;
    }>;
    getSalesDetails(startDate?: string, endDate?: string): Promise<any>;
    ingestBranchReport(dto: any): Promise<{
        success: boolean;
        message: string;
        reportId: number;
        data: BranchSyncedReport;
    }>;
    getUnifiedBranchReports(startDate?: string, endDate?: string, branchCode?: string): Promise<{
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
        records: BranchSyncedReport[];
    }>;
}
