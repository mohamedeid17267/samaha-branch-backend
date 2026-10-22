import { Role } from './role.entity';
import { Branch } from './branch.entity';
export declare class User {
    id: number;
    username: string;
    email: string;
    password: string;
    fullName: string;
    permissions: string[];
    role: Role;
    roleId: number;
    branch: Branch;
    branchId: number | null;
    createdAt: Date;
    updatedAt: Date;
}
