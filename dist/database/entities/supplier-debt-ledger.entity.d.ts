import { Supplier } from './supplier.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
export declare class SupplierDebtLedger {
    id: number;
    supplierId: number;
    supplier: Supplier;
    branchId?: number;
    transactionType: TransactionType;
    invoiceNumber?: string;
    amount: number;
    paidAmount: number;
    balanceAfter: number;
    paymentMethod?: string;
    description?: string;
    invoiceDate?: string;
    recordedBy?: string;
    createdAt: Date;
}
