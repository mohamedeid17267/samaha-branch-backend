import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { User } from '../../database/entities/user.entity';
export declare class BranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    create(createBranchDto: CreateBranchDto, user: User): Promise<import("../../database/entities/branch.entity").Branch>;
    update(id: number, updateData: any, user: User): Promise<import("../../database/entities/branch.entity").Branch>;
    findAll(page?: number, limit?: number): Promise<{
        data: import("../../database/entities/branch.entity").Branch[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<import("../../database/entities/branch.entity").Branch>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
