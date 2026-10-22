import { Repository } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BrandRoyaltyLedger } from '../../database/entities/brand-royalty-ledger.entity';
import { Role } from '../../database/entities/role.entity';
import { ActivityService } from '../activity/activity.service';
import { AuthService } from '../auth/auth.service';
export declare class BranchesService {
    private branchRepository;
    private royaltyRepository;
    private roleRepository;
    private activityService;
    private authService;
    constructor(branchRepository: Repository<Branch>, royaltyRepository: Repository<BrandRoyaltyLedger>, roleRepository: Repository<Role>, activityService: ActivityService, authService: AuthService);
    create(createBranchDto: CreateBranchDto, username?: string): Promise<Branch>;
    findAll(page?: number, limit?: number): Promise<{
        data: Branch[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<Branch>;
    update(id: number, updateData: any, username?: string): Promise<Branch>;
    remove(id: number): Promise<void>;
}
