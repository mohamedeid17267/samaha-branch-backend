import { User } from './user.entity';
import { BranchInventory } from './branch-inventory.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BrandRoyaltyLedger } from './brand-royalty-ledger.entity';
import { InventoryDebtLedger } from './inventory-debt-ledger.entity';
import { BranchExpense } from './branch-expense.entity';
import { BranchDailyRevenue } from './branch-daily-revenue.entity';
export declare class Branch {
    id: number;
    name: string;
    location: string;
    status: string;
    monthlyRoyalty: number;
    royaltyDueDay: number;
    createdAt: Date;
    updatedAt: Date;
    users: User[];
    inventories: BranchInventory[];
    purchaseOrders: PurchaseOrder[];
    royaltyLedgers: BrandRoyaltyLedger[];
    debtLedgers: InventoryDebtLedger[];
    expenses: BranchExpense[];
    dailyRevenues: BranchDailyRevenue[];
}
