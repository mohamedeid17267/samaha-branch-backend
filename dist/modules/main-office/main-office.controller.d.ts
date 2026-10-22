import { MainOfficeService } from './main-office.service';
import { User } from '../../database/entities/user.entity';
export declare class MainOfficeController {
    private readonly service;
    constructor(service: MainOfficeService);
    getExpenses(): Promise<import("../../database/entities/main-office-expense.entity").MainOfficeExpense[]>;
    addExpense(data: any, user: User): Promise<import("../../database/entities/main-office-expense.entity").MainOfficeExpense>;
    deleteExpense(id: number): Promise<import("typeorm").DeleteResult>;
    getContainers(): Promise<import("../../database/entities/import-container.entity").ImportContainer[]>;
    addContainer(data: any): Promise<import("../../database/entities/import-container.entity").ImportContainer[]>;
    deleteContainer(id: number): Promise<import("typeorm").DeleteResult>;
    getInventory(containerId?: number): Promise<import("../../database/entities/main-office-inventory.entity").MainOfficeInventory[]>;
    receiveGoods(data: {
        containerId: number;
        productId: number;
        quantity: number;
        costPrice?: number;
        notes?: string;
    }): Promise<import("../../database/entities/main-office-inventory.entity").MainOfficeInventory>;
    withdrawGoods(data: {
        containerId: number;
        productId: number;
        quantity: number;
        notes?: string;
    }): Promise<import("../../database/entities/main-office-inventory.entity").MainOfficeInventory>;
    auditInventory(data: {
        containerId: number;
        productId: number;
        actualQuantity: number;
        notes?: string;
    }): Promise<import("../../database/entities/main-office-inventory.entity").MainOfficeInventory>;
    getTransactions(): Promise<import("../../database/entities/main-office-transaction.entity").MainOfficeTransaction[]>;
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
    getBranchDeepDive(id: string): Promise<{
        branch: import("../../database/entities/branch.entity").Branch;
        sales: import("../../database/entities/branch-sale.entity").BranchSale[];
        inventory: import("../../database/entities/branch-inventory.entity").BranchInventory[];
        customers: import("../../database/entities/customer.entity").Customer[];
        suppliers: import("../../database/entities/supplier.entity").Supplier[];
        expenses: import("../../database/entities/branch-expense.entity").BranchExpense[];
        revenues: import("../../database/entities/branch-daily-revenue.entity").BranchDailyRevenue[];
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
