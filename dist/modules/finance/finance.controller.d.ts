import { FinanceService } from './finance.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordChargeDto } from './dto/record-charge.dto';
import { User } from '../../database/entities/user.entity';
export declare class FinanceController {
    private readonly financeService;
    deletePayment(ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT', id: string, req: any): Promise<{
        message: string;
    }>;
    updatePayment(ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT', id: string, body: any, req: any): Promise<{
        message: string;
    }>;
    constructor(financeService: FinanceService);
    recordPayment(paymentDto: RecordPaymentDto, user: User): Promise<import("../../database/entities/brand-royalty-ledger.entity").BrandRoyaltyLedger | import("../../database/entities/inventory-debt-ledger.entity").InventoryDebtLedger>;
    recordRoyaltyCharge(chargeDto: RecordChargeDto, user: User): Promise<import("../../database/entities/brand-royalty-ledger.entity").BrandRoyaltyLedger>;
    getRoyaltyLedger(branchId: number, page?: number, limit?: number): Promise<{
        history: import("../../database/entities/brand-royalty-ledger.entity").BrandRoyaltyLedger[];
        currentBalance: number;
        total: number;
        page: number;
        limit: number;
    }>;
    getInventoryDebtLedger(branchId: number, page?: number, limit?: number): Promise<{
        history: import("../../database/entities/inventory-debt-ledger.entity").InventoryDebtLedger[];
        currentBalance: number;
        total: number;
        page: number;
        limit: number;
    }>;
    getAllBranchFinancialSummaries(): Promise<{
        branchName: string;
        branchId: number;
        brandRoyaltyDebt: number;
        inventoryDebt: number;
        totalOutstandingDebt: number;
        totalBranchExpenses: number;
        totalBranchRevenues: number;
    }[]>;
    getAllPayments(): Promise<any[]>;
    getBranchFinancialSummary(branchId: number): Promise<{
        branchId: number;
        brandRoyaltyDebt: number;
        inventoryDebt: number;
        totalOutstandingDebt: number;
        totalBranchExpenses: number;
        totalBranchRevenues: number;
    }>;
    getLiabilities(): Promise<import("../../database/entities/liability.entity").Liability[]>;
    addLiability(data: any, user: User): Promise<import("../../database/entities/liability.entity").Liability>;
    updateLiability(id: number, data: any): Promise<import("../../database/entities/liability.entity").Liability | null>;
    deleteLiability(id: number): Promise<import("typeorm").DeleteResult>;
    getAllBranchExpenses(): Promise<import("../../database/entities/branch-expense.entity").BranchExpense[]>;
    getBranchExpenses(branchId: number): Promise<import("../../database/entities/branch-expense.entity").BranchExpense[]>;
    addBranchExpense(branchId: number, data: any): Promise<import("../../database/entities/branch-expense.entity").BranchExpense[]>;
    getAllBranchDailyRevenues(): Promise<import("../../database/entities/branch-daily-revenue.entity").BranchDailyRevenue[]>;
    getBranchDailyRevenues(branchId: number): Promise<import("../../database/entities/branch-daily-revenue.entity").BranchDailyRevenue[]>;
    addBranchDailyRevenue(branchId: number, data: any): Promise<import("../../database/entities/branch-daily-revenue.entity").BranchDailyRevenue[]>;
}
