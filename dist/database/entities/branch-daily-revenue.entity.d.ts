import { Branch } from './branch.entity';
export declare class BranchDailyRevenue {
    id: number;
    branchId: number;
    branch: Branch;
    totalAmount: number;
    revenueDate: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
