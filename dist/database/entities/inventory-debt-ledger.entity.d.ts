import { Branch } from './branch.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
export declare class InventoryDebtLedger {
    id: number;
    branchId: number;
    branch: Branch;
    transactionType: TransactionType;
    relatedOrderId: number | null;
    relatedOrder: PurchaseOrder | null;
    amount: number;
    balanceAfter: number;
    description: string;
    receiptUrl: string | null;
    createdAt: Date;
}
