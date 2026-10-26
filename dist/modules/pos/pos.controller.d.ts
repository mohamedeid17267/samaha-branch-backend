import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { User } from '../../database/entities/user.entity';
export declare class PosController {
    private readonly posService;
    constructor(posService: PosService);
    createSale(createSaleDto: CreateSaleDto, user: User, idempotencyKeyHeader?: string): Promise<import("../../database/entities/branch-sale.entity").BranchSale>;
    returnSale(returnDto: any, user: User): Promise<{
        success: boolean;
        message: string;
        refundAmount: any;
        originalSaleId: number | undefined;
    }>;
    syncBatch(batchData: any, user: User): Promise<{
        success: boolean;
        processedCount: number;
        acknowledgments: {
            operationId: string;
            status: string;
            remoteId?: number;
            error?: string;
        }[];
    }>;
    getSales(branchId?: number, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
        data: import("../../database/entities/branch-sale.entity").BranchSale[];
        total: number;
        page: number;
        limit: number;
        summary: {
            totalSales: number;
            invoicesCount: number;
            totalItemsCount: number;
            cashTotal: number;
            visaTotal: number;
            instapayTotal: number;
            walletTotal: number;
            creditTotal: number;
        };
    }>;
    getTreasuryReport(branchId?: number, startDate?: string, endDate?: string): Promise<{
        totals: {
            cash: number;
            instapay: number;
            wallet: number;
            card: number;
            credit: number;
            totalCollected: number;
            totalSales: number;
            invoicesCount: number;
        };
        counts: {
            cash: number;
            instapay: number;
            wallet: number;
            card: number;
            credit: number;
        };
        sales: import("../../database/entities/branch-sale.entity").BranchSale[];
        debtPayments: import("../../database/entities/customer-debt-ledger.entity").CustomerDebtLedger[];
    }>;
}
