export declare class BranchSyncedReport {
    id: number;
    branchCode: string;
    branchName: string;
    reportDate: string;
    totalSales: number;
    totalOrders: number;
    cashSales: number;
    visaSales: number;
    totalExpenses: number;
    netProfit: number;
    currentStockValue: number;
    notes: string | null;
    rawDetails: any;
    syncStatus: string;
    createdAt: Date;
    updatedAt: Date;
}
