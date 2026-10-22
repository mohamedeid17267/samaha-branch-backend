export declare class IngestBranchReportDto {
    branchCode: string;
    branchName: string;
    reportDate: string;
    totalSales: number;
    totalOrders?: number;
    cashSales?: number;
    visaSales?: number;
    totalExpenses?: number;
    netProfit?: number;
    currentStockValue?: number;
    notes?: string;
    rawDetails?: any;
}
