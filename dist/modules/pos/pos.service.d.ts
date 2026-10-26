import { Repository, DataSource } from 'typeorm';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ActivityService } from '../activity/activity.service';
import { MemoryCacheService } from '../../common/services/cache.service';
import { WebsiteSyncService } from '../../common/services/website-sync.service';
export declare class PosService {
    private saleRepository;
    private dataSource;
    private activityService;
    private cacheService;
    private websiteSyncService;
    private readonly logger;
    constructor(saleRepository: Repository<BranchSale>, dataSource: DataSource, activityService: ActivityService, cacheService: MemoryCacheService, websiteSyncService: WebsiteSyncService);
    createSale(createSaleDto: CreateSaleDto, username?: string): Promise<BranchSale>;
    getSales(branchId?: number, page?: number, limit?: number, startDate?: string, endDate?: string): Promise<{
        data: BranchSale[];
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
    getTreasuryReport(branchId: number, startDate?: string, endDate?: string): Promise<{
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
        sales: BranchSale[];
        debtPayments: CustomerDebtLedger[];
    }>;
    syncBatch(batchData: {
        branchId?: number;
        branchCode?: string;
        deviceId?: string;
        operations: Array<{
            operationId: string;
            idempotencyKey: string;
            entityType: string;
            operationType: string;
            entityId: string;
            payload: any;
            createdAt?: string;
        }>;
    }, username?: string): Promise<{
        success: boolean;
        processedCount: number;
        acknowledgments: {
            operationId: string;
            status: string;
            remoteId?: number;
            error?: string;
        }[];
    }>;
    processSaleReturn(returnDto: any, username?: string): Promise<{
        success: boolean;
        message: string;
        refundAmount: any;
        originalSaleId: number | undefined;
    }>;
}
