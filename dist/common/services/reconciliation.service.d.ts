import { DataSource } from 'typeorm';
export declare class ReconciliationService {
    private dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    reconcileCustomerBalance(customerId: number): Promise<{
        totalInvoiced: number;
        totalPaid: number;
        currentDebt: number;
    }>;
    reconcileStockMovements(productId: number, branchId: number): Promise<{
        derivedStock: number;
        isNegative: boolean;
    }>;
}
