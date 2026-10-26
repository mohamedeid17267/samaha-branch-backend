import { Branch } from './branch.entity';
import { BranchSaleItem } from './branch-sale-item.entity';
import { Customer } from './customer.entity';
export declare class BranchSale {
    id: number;
    branchId: number;
    branch: Branch;
    totalAmount: number;
    discount: number;
    netAmount: number;
    paymentMethod: string;
    saleType: string;
    status: string;
    customerName: string;
    customerId?: number;
    customer?: Customer;
    paidAmount: number;
    remainingAmount: number;
    idempotencyKey?: string;
    offlineReferenceId?: string;
    invoiceNumber?: string;
    deviceId?: string;
    syncedAt?: Date;
    items: BranchSaleItem[];
    createdAt: Date;
    updatedAt: Date;
}
