import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
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
}
