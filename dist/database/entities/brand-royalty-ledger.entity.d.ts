import { Branch } from './branch.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
export declare class BrandRoyaltyLedger {
    id: number;
    branchId: number;
    branch: Branch;
    transactionType: TransactionType;
    amount: number;
    balanceAfter: number;
    description: string;
    receiptUrl: string | null;
    createdAt: Date;
}
