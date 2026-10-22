import { Repository } from 'typeorm';
import { MainOfficeExpense } from '../../database/entities/main-office-expense.entity';
import { ImportContainer } from '../../database/entities/import-container.entity';
import { MainOfficeInventory } from '../../database/entities/main-office-inventory.entity';
import { MainOfficeTransaction } from '../../database/entities/main-office-transaction.entity';
import { Product } from '../../database/entities/product.entity';
import { ActivityService } from '../activity/activity.service';
import { Branch } from '../../database/entities/branch.entity';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { BranchDailyRevenue } from '../../database/entities/branch-daily-revenue.entity';
export declare class MainOfficeService {
    private expensesRepo;
    private containersRepo;
    private inventoryRepo;
    private transactionsRepo;
    private productRepo;
    private branchRepo;
    private branchSaleRepo;
    private branchInventoryRepo;
    private customerRepo;
    private supplierRepo;
    private branchExpenseRepo;
    private branchRevenueRepo;
    private activityService;
    constructor(expensesRepo: Repository<MainOfficeExpense>, containersRepo: Repository<ImportContainer>, inventoryRepo: Repository<MainOfficeInventory>, transactionsRepo: Repository<MainOfficeTransaction>, productRepo: Repository<Product>, branchRepo: Repository<Branch>, branchSaleRepo: Repository<BranchSale>, branchInventoryRepo: Repository<BranchInventory>, customerRepo: Repository<Customer>, supplierRepo: Repository<Supplier>, branchExpenseRepo: Repository<BranchExpense>, branchRevenueRepo: Repository<BranchDailyRevenue>, activityService: ActivityService);
    getExpenses(): Promise<MainOfficeExpense[]>;
    addExpense(data: any, username?: string): Promise<MainOfficeExpense>;
    deleteExpense(id: number): Promise<import("typeorm").DeleteResult>;
    getContainers(): Promise<ImportContainer[]>;
    addContainer(data: any): Promise<ImportContainer[]>;
    deleteContainer(id: number): Promise<import("typeorm").DeleteResult>;
    getInventory(containerId?: number): Promise<MainOfficeInventory[]>;
    receiveGoods(containerId: number, productId: number, quantity: number, costPrice?: number, notes?: string): Promise<MainOfficeInventory>;
    withdrawGoods(containerId: number, productId: number, quantity: number, notes?: string): Promise<MainOfficeInventory>;
    auditInventory(containerId: number, productId: number, actualQuantity: number, notes?: string): Promise<MainOfficeInventory>;
    getTransactions(): Promise<MainOfficeTransaction[]>;
    getBranchesOverview(): Promise<{
        enterprise: {
            totalBranches: number;
            activeBranches: number;
            totalSales: number;
            totalSalesCount: number;
            todaySales: number;
            todaySalesCount: number;
            totalStockQuantity: number;
            totalStockValue: number;
            totalLowStockItems: number;
            totalCustomerReceivables: number;
            totalSupplierPayables: number;
            totalCashInSafes: number;
        };
        branches: {
            id: number;
            name: string;
            location: string;
            status: string;
            monthlyRoyalty: number;
            sales: {
                totalAmount: number;
                invoicesCount: number;
                cashAmount: number;
                visaAmount: number;
                todayAmount: number;
                todayCount: number;
            };
            inventory: {
                itemsCount: number;
                totalQuantity: number;
                totalValue: number;
                lowStockCount: number;
                outOfStockCount: number;
            };
            customers: {
                count: number;
                totalDebt: number;
                totalInvoiced: number;
                totalPaid: number;
            };
            suppliers: {
                count: number;
                totalDebt: number;
                totalInvoiced: number;
                totalPaid: number;
            };
            safe: {
                totalRevenues: number;
                totalExpenses: number;
                balance: number;
            };
        }[];
    }>;
    getBranchDeepDive(branchId: number): Promise<{
        branch: Branch;
        sales: BranchSale[];
        inventory: BranchInventory[];
        customers: Customer[];
        suppliers: Supplier[];
        expenses: BranchExpense[];
        revenues: BranchDailyRevenue[];
        summary: {
            totalSalesAmount: number;
            invoicesCount: number;
            totalInventoryValue: number;
            inventoryCount: number;
            totalCustomerDebt: number;
            customersCount: number;
            totalSupplierDebt: number;
            suppliersCount: number;
            totalExpenses: number;
            totalRevenues: number;
            safeBalance: number;
        };
    }>;
}
