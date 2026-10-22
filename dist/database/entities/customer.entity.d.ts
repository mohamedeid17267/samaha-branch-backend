import { CustomerDebtLedger } from './customer-debt-ledger.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BranchSale } from './branch-sale.entity';
export declare class Customer {
    id: number;
    branchId?: number;
    name: string;
    customerCode?: string;
    phone?: string;
    address?: string;
    notes?: string;
    totalInvoiced: number;
    totalPaid: number;
    currentDebt: number;
    createdAt: Date;
    updatedAt: Date;
    debtLedgers: CustomerDebtLedger[];
    purchaseOrders: PurchaseOrder[];
    sales: BranchSale[];
}
