"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const branch_entity_1 = require("../../database/entities/branch.entity");
const brand_royalty_ledger_entity_1 = require("../../database/entities/brand-royalty-ledger.entity");
const inventory_debt_ledger_entity_1 = require("../../database/entities/inventory-debt-ledger.entity");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const user_entity_1 = require("../../database/entities/user.entity");
const role_entity_1 = require("../../database/entities/role.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
const role_enum_1 = require("../../common/enums/role.enum");
const activity_service_1 = require("../activity/activity.service");
const auth_service_1 = require("../auth/auth.service");
let BranchesService = class BranchesService {
    branchRepository;
    royaltyRepository;
    roleRepository;
    activityService;
    authService;
    constructor(branchRepository, royaltyRepository, roleRepository, activityService, authService) {
        this.branchRepository = branchRepository;
        this.royaltyRepository = royaltyRepository;
        this.roleRepository = roleRepository;
        this.activityService = activityService;
        this.authService = authService;
    }
    async create(createBranchDto, username = 'System') {
        const { managerUsername, managerPassword, managerFullName, ...branchData } = createBranchDto;
        const branch = this.branchRepository.create(branchData);
        const saved = await this.branchRepository.save(branch);
        if (saved.monthlyRoyalty && Number(saved.monthlyRoyalty) > 0) {
            const royaltyCharge = this.royaltyRepository.create({
                branchId: saved.id,
                transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                amount: Number(saved.monthlyRoyalty),
                balanceAfter: Number(saved.monthlyRoyalty),
                description: 'إيراد الجمعية للشهر الأول (افتتاحي)',
            });
            await this.royaltyRepository.save(royaltyCharge);
        }
        if (managerUsername && managerPassword) {
            try {
                const branchManagerRole = await this.roleRepository.findOne({
                    where: { name: role_enum_1.RoleEnum.BRANCH_MANAGER },
                });
                if (!branchManagerRole) {
                    throw new Error('Branch Manager role not found in database');
                }
                await this.authService.register({
                    username: managerUsername,
                    password: managerPassword,
                    email: `${managerUsername}@branch.local`,
                    roleId: branchManagerRole.id,
                    branchId: saved.id,
                    fullName: managerFullName || managerUsername,
                });
            }
            catch (err) {
                console.error('Failed to create manager account for branch:', err);
            }
        }
        await this.activityService.createAuditLog(username, 'إنشاء فرع جديد', `تم إنشاء فرع: ${saved.name}`);
        return saved;
    }
    async findAll(page = 1, limit = 10) {
        const [data, total] = await this.branchRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return {
            data,
            total,
            page,
            limit,
        };
    }
    async findOne(id) {
        const branch = await this.branchRepository.findOne({
            where: { id },
            relations: { users: true, inventories: { product: true } },
        });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with ID ${id} not found`);
        }
        return branch;
    }
    async update(id, updateData, username = 'System/Admin') {
        const branch = await this.findOne(id);
        const oldRoyalty = Number(branch.monthlyRoyalty);
        const changes = [];
        const arabicNames = {
            name: 'اسم الفرع',
            location: 'الموقع',
            phone: 'رقم الهاتف',
            managerName: 'اسم المدير',
            status: 'الحالة',
            monthlyRoyalty: 'إيراد الجمعية الشهري',
        };
        for (const key of Object.keys(updateData)) {
            if (updateData[key] !== undefined &&
                updateData[key] !== branch[key]) {
                const fieldName = arabicNames[key] || key;
                changes.push(`${fieldName} (من "${branch[key] || 'فارغ'}" إلى "${updateData[key]}")`);
            }
        }
        Object.assign(branch, updateData);
        const updatedBranch = await this.branchRepository.save(branch);
        if (updateData.monthlyRoyalty !== undefined &&
            Number(updateData.monthlyRoyalty) !== oldRoyalty) {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            const currentMonthCharge = await this.royaltyRepository.findOne({
                where: {
                    branchId: id,
                    transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                    createdAt: (0, typeorm_2.Between)(startOfMonth, endOfMonth),
                },
            });
            if (currentMonthCharge) {
                currentMonthCharge.amount = Number(updateData.monthlyRoyalty);
                await this.royaltyRepository.save(currentMonthCharge);
                const entries = await this.royaltyRepository.find({
                    where: { branchId: id },
                    order: { id: 'ASC' },
                });
                let currentBalance = 0;
                for (const entry of entries) {
                    if (entry.transactionType === transaction_type_enum_1.TransactionType.CHARGE) {
                        currentBalance += Number(entry.amount);
                    }
                    else {
                        currentBalance -= Number(entry.amount);
                    }
                    entry.balanceAfter = currentBalance;
                    await this.royaltyRepository.save(entry);
                }
            }
        }
        const changesText = changes.length > 0
            ? ` التغييرات: ${changes.join('، ')}.`
            : ' بدون تغييرات فعلية.';
        await this.activityService.createAuditLog(username, 'تعديل فرع', `تم تعديل بيانات فرع: ${updatedBranch.name}.${changesText}`);
        return updatedBranch;
    }
    async remove(id) {
        const queryRunner = this.branchRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, {
                where: { id },
            });
            if (!branch) {
                throw new common_1.NotFoundException(`Branch with ID ${id} not found`);
            }
            await queryRunner.manager.delete(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, { branchId: id });
            await queryRunner.manager.delete(inventory_debt_ledger_entity_1.InventoryDebtLedger, { branchId: id });
            const orders = await queryRunner.manager.find(purchase_order_entity_1.PurchaseOrder, {
                where: { branchId: id },
            });
            const orderIds = orders.map((o) => o.id);
            if (orderIds.length > 0) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .delete()
                    .from('order_items')
                    .where('purchaseOrderId IN (:...orderIds)', { orderIds })
                    .execute();
                await queryRunner.manager.delete(purchase_order_entity_1.PurchaseOrder, orderIds);
            }
            await queryRunner.manager.delete(branch_inventory_entity_1.BranchInventory, { branchId: id });
            await queryRunner.manager.delete(user_entity_1.User, { branchId: id });
            await queryRunner.manager.delete(branch_entity_1.Branch, id);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(branch_entity_1.Branch)),
    __param(1, (0, typeorm_1.InjectRepository)(brand_royalty_ledger_entity_1.BrandRoyaltyLedger)),
    __param(2, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        activity_service_1.ActivityService,
        auth_service_1.AuthService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map