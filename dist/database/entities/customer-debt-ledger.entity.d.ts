import { Customer } from './customer.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BranchSale } from './branch-sale.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
export declare class CustomerDebtLedger {
    id: number;
    customerId: number;
    customer: Customer;
    branchId?: number;
    transactionType: TransactionType;
    invoiceNumber?: string;
    relatedOrderId: number | null;
    relatedOrder: PurchaseOrder | null;
    relatedSaleId: number | null;
    relatedSale: BranchSale | null;
    amount: number;
    paidAmount: number;
    balanceAfter: number;
    paymentMethod?: string;
    description?: string;
    invoiceDate?: string;
    recordedBy?: string;
    receiptUrl: string | null;
    createdAt: Date;
}
