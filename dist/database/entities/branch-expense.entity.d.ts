import { Branch } from './branch.entity';
export declare class BranchExpense {
    id: number;
    branchId: number;
    branch: Branch;
    description: string;
    amount: number;
    category: string;
    expenseDate: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
