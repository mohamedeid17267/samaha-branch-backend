import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BrandRoyaltyLedger } from '../../database/entities/brand-royalty-ledger.entity';
import { InventoryDebtLedger } from '../../database/entities/inventory-debt-ledger.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { RoleEnum } from '../../common/enums/role.enum';
import { ActivityService } from '../activity/activity.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(BrandRoyaltyLedger)
    private royaltyRepository: Repository<BrandRoyaltyLedger>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private activityService: ActivityService,
    private authService: AuthService,
  ) {}

  async create(
    createBranchDto: CreateBranchDto,
    username = 'System',
  ): Promise<Branch> {
    const { managerUsername, managerPassword, managerFullName, ...branchData } =
      createBranchDto;

    const branch = this.branchRepository.create(branchData);
    const saved = await this.branchRepository.save(branch);

    if (saved.monthlyRoyalty && Number(saved.monthlyRoyalty) > 0) {
      const royaltyCharge = this.royaltyRepository.create({
        branchId: saved.id,
        transactionType: TransactionType.CHARGE,
        amount: Number(saved.monthlyRoyalty),
        balanceAfter: Number(saved.monthlyRoyalty),
        description: 'إيراد الجمعية للشهر الأول (افتتاحي)',
      });
      await this.royaltyRepository.save(royaltyCharge);
    }

    if (managerUsername && managerPassword) {
      try {
        const branchManagerRole = await this.roleRepository.findOne({
          where: { name: RoleEnum.BRANCH_MANAGER },
        });

        if (!branchManagerRole) {
          throw new Error('Branch Manager role not found in database');
        }

        await this.authService.register({
          username: managerUsername,
          password: managerPassword,
          email: `${managerUsername}@branch.local`, // Mock email since it's required by DTO
          roleId: branchManagerRole.id,
          branchId: saved.id,
          fullName: managerFullName || managerUsername,
        });
      } catch (err) {
        // If manager creation fails (e.g. username taken), log it but don't fail branch creation
        console.error('Failed to create manager account for branch:', err);
      }
    }

    await this.activityService.createAuditLog(
      username,
      'إنشاء فرع جديد',
      `تم إنشاء فرع: ${saved.name}`,
    );
    return saved;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: Branch[]; total: number; page: number; limit: number }> {
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

  async findOne(id: number): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: { users: true, inventories: { product: true } },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async update(
    id: number,
    updateData: any,
    username = 'System/Admin',
  ): Promise<Branch> {
    const branch = await this.findOne(id);
    const oldRoyalty = Number(branch.monthlyRoyalty);

    // Track changes for audit log
    const changes: string[] = [];
    const arabicNames: Record<string, string> = {
      name: 'اسم الفرع',
      location: 'الموقع',
      phone: 'رقم الهاتف',
      managerName: 'اسم المدير',
      status: 'الحالة',
      monthlyRoyalty: 'إيراد الجمعية الشهري',
    };

    for (const key of Object.keys(updateData)) {
      if (
        updateData[key] !== undefined &&
        updateData[key] !== branch[key as keyof Branch]
      ) {
        const fieldName = arabicNames[key] || key;
        changes.push(
          `${fieldName} (من "${branch[key as keyof Branch] || 'فارغ'}" إلى "${updateData[key]}")`,
        );
      }
    }

    Object.assign(branch, updateData);
    const updatedBranch = await this.branchRepository.save(branch);

    // If monthlyRoyalty was updated, we update the current month's charge (if it exists)
    if (
      updateData.monthlyRoyalty !== undefined &&
      Number(updateData.monthlyRoyalty) !== oldRoyalty
    ) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      // Find ANY charge for the current month (could be manual or automatic)
      const currentMonthCharge = await this.royaltyRepository.findOne({
        where: {
          branchId: id,
          transactionType: TransactionType.CHARGE,
          createdAt: Between(startOfMonth, endOfMonth),
        },
      });

      if (currentMonthCharge) {
        currentMonthCharge.amount = Number(updateData.monthlyRoyalty);
        await this.royaltyRepository.save(currentMonthCharge);

        // Recalculate ledger balances for this branch
        const entries = await this.royaltyRepository.find({
          where: { branchId: id },
          order: { id: 'ASC' },
        });

        let currentBalance = 0;
        for (const entry of entries) {
          if (entry.transactionType === TransactionType.CHARGE) {
            currentBalance += Number(entry.amount);
          } else {
            currentBalance -= Number(entry.amount);
          }
          entry.balanceAfter = currentBalance;
          await this.royaltyRepository.save(entry);
        }
      }
    }

    const changesText =
      changes.length > 0
        ? ` التغييرات: ${changes.join('، ')}.`
        : ' بدون تغييرات فعلية.';
    await this.activityService.createAuditLog(
      username,
      'تعديل فرع',
      `تم تعديل بيانات فرع: ${updatedBranch.name}.${changesText}`,
    );
    return updatedBranch;
  }

  async remove(id: number): Promise<void> {
    const queryRunner =
      this.branchRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const branch = await queryRunner.manager.findOne(Branch, {
        where: { id },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${id} not found`);
      }

      // 1. Delete BrandRoyaltyLedger entries
      await queryRunner.manager.delete(BrandRoyaltyLedger, { branchId: id });

      // 2. Delete InventoryDebtLedger entries
      await queryRunner.manager.delete(InventoryDebtLedger, { branchId: id });

      // 3. Delete PurchaseOrder items first, then PurchaseOrders
      const orders = await queryRunner.manager.find(PurchaseOrder, {
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

        await queryRunner.manager.delete(PurchaseOrder, orderIds);
      }

      // 4. Delete BranchInventory entries
      await queryRunner.manager.delete(BranchInventory, { branchId: id });

      // 5. Delete users belonging to this branch
      await queryRunner.manager.delete(User, { branchId: id });

      // 6. Delete the Branch itself
      await queryRunner.manager.delete(Branch, id);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
