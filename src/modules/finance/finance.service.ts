import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { BrandRoyaltyLedger } from '../../database/entities/brand-royalty-ledger.entity';
import { InventoryDebtLedger } from '../../database/entities/inventory-debt-ledger.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { Branch } from '../../database/entities/branch.entity';
import { Customer } from '../../database/entities/customer.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { RecordPaymentDto, LedgerType } from './dto/record-payment.dto';
import { RecordChargeDto } from './dto/record-charge.dto';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { ActivityService } from '../activity/activity.service';
import { Liability } from '../../database/entities/liability.entity';

import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { BranchDailyRevenue } from '../../database/entities/branch-daily-revenue.entity';
import { MemoryCacheService } from '../../common/services/cache.service';

@Injectable()
export class FinanceService implements OnApplicationBootstrap {

  async recalculateLedger(ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT', idParam: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let repo: any;
      let whereClause: any;

      if (ledgerType === 'ROYALTY') {
        repo = queryRunner.manager.getRepository(BrandRoyaltyLedger);
        whereClause = { branchId: idParam };
      } else if (ledgerType === 'INVENTORY_DEBT') {
        repo = queryRunner.manager.getRepository(InventoryDebtLedger);
        whereClause = { branchId: idParam };
      } else {
        repo = queryRunner.manager.getRepository(CustomerDebtLedger);
        whereClause = { customerId: idParam };
      }

      const records = await repo.find({
        where: whereClause,
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' }
      });

      let currentBalance = 0;
      for (const record of records) {
        if (record.transactionType === TransactionType.CHARGE) {
          currentBalance += Number(record.amount);
        } else if (record.transactionType === TransactionType.PAYMENT) {
          currentBalance -= Number(record.amount);
        }
        record.balanceAfter = currentBalance;
        await repo.save(record);
      }

      // Update final balance
      if (ledgerType === 'CUSTOMER_DEBT') {
        const customer = await queryRunner.manager.findOne(Customer, { where: { id: idParam } });
        if (customer) {
          customer.currentDebt = currentBalance;
          await queryRunner.manager.save(customer);
        }
      } else if (ledgerType === 'ROYALTY') {
         // branch logic
         const branch = await queryRunner.manager.findOne(Branch, { where: { id: idParam } });
         if (branch) {
           const summaries = await queryRunner.manager.query(`SELECT * FROM branch_revenues WHERE branchId = ?`, [idParam]);
           if (summaries && summaries.length > 0) {
              await queryRunner.manager.query(`UPDATE branch_revenues SET brandRoyaltyDebt = ? WHERE branchId = ?`, [currentBalance, idParam]);
           }
         }
      } else if (ledgerType === 'INVENTORY_DEBT') {
         const branch = await queryRunner.manager.findOne(Branch, { where: { id: idParam } });
         if (branch) {
           const summaries = await queryRunner.manager.query(`SELECT * FROM branch_revenues WHERE branchId = ?`, [idParam]);
           if (summaries && summaries.length > 0) {
              await queryRunner.manager.query(`UPDATE branch_revenues SET currentInventoryDebt = ? WHERE branchId = ?`, [currentBalance, idParam]);
           }
         }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  
  async updatePayment(ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT', paymentId: number, dto: any, username: string): Promise<void> {
     let record;
     let idParam;
     if (ledgerType === 'ROYALTY') {
       record = await this.royaltyRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.branchId;
       record.amount = dto.amount;
       if (dto.description) record.description = dto.description;
       if (dto.createdAt) record.createdAt = dto.createdAt;
       await this.royaltyRepository.save(record);
     } else if (ledgerType === 'INVENTORY_DEBT') {
       record = await this.debtRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.branchId;
       record.amount = dto.amount;
       if (dto.description) record.description = dto.description;
       if (dto.createdAt) record.createdAt = dto.createdAt;
       await this.debtRepository.save(record);
     } else {
       record = await this.customerLedgerRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.customerId;
       record.amount = dto.amount;
       if (dto.description) record.description = dto.description;
       if (dto.createdAt) record.createdAt = dto.createdAt;
       await this.customerLedgerRepository.save(record);
     }

     await this.recalculateLedger(ledgerType, idParam);

     await this.activityService.createAuditLog(
        username,
        'تعديل سداد مالي',
        `تم تعديل سداد مالي ليكون بقيمة ${record.amount} في ${ledgerType}`
      );
  }

  async deletePayment(ledgerType: 'ROYALTY' | 'INVENTORY_DEBT' | 'CUSTOMER_DEBT', paymentId: number, username: string): Promise<void> {
     let record;
     let idParam;
     if (ledgerType === 'ROYALTY') {
       record = await this.royaltyRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.branchId;
       await this.royaltyRepository.remove(record);
     } else if (ledgerType === 'INVENTORY_DEBT') {
       record = await this.debtRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.branchId;
       await this.debtRepository.remove(record);
     } else {
       record = await this.customerLedgerRepository.findOne({ where: { id: paymentId } });
       if(!record) throw new NotFoundException('Payment not found');
       idParam = record.customerId;
       await this.customerLedgerRepository.remove(record);
     }

     await this.recalculateLedger(ledgerType, idParam);

     await this.activityService.createAuditLog(
        username,
        'حذف سداد مالي',
        `تم حذف سداد مالي بقيمة ${record.amount} من ${ledgerType}`
      );
  }

  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(BrandRoyaltyLedger)
    private royaltyRepository: Repository<BrandRoyaltyLedger>,
    @InjectRepository(InventoryDebtLedger)
    private debtRepository: Repository<InventoryDebtLedger>,
    @InjectRepository(CustomerDebtLedger)
    private customerLedgerRepository: Repository<CustomerDebtLedger>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Liability)
    private liabilityRepository: Repository<Liability>,
    @InjectRepository(BranchExpense)
    private branchExpenseRepository: Repository<BranchExpense>,
    @InjectRepository(BranchDailyRevenue)
    private branchDailyRevenueRepository: Repository<BranchDailyRevenue>,
    private dataSource: DataSource,
    private activityService: ActivityService,
    private cacheService: MemoryCacheService,
  ) {}

  onApplicationBootstrap() {
    // Run asynchronously without delaying server port binding
    setImmediate(async () => {
      try {
        const branches = await this.branchRepository.find();
        await Promise.all(
          branches.map(async (b) => {
            await this.verifyAndApplyMonthlyRoyalty(b.id);
            await this.checkLateDebtsAndNotify(b);
          }),
        );
      } catch (err) {
        this.logger.error('Error in onApplicationBootstrap for monthly royalties:', err);
      }
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRoyaltyCheck() {
    this.logger.log('Running daily check for Assembly Revenues (Royalties)...');
    try {
      const branches = await this.branchRepository.find({
        where: { status: 'ACTIVE' },
      });
      for (const b of branches) {
        await this.verifyAndApplyMonthlyRoyalty(b.id);
        await this.checkLateDebtsAndNotify(b);
      }
      this.logger.log('Daily check completed.');
    } catch (err) {
      this.logger.error('Error in handleDailyRoyaltyCheck', err);
    }
  }

  /**
   * Checks if a branch has late debts (>30 days) and creates a notification if so.
   */
  async checkLateDebtsAndNotify(branch: Branch) {
    const today = new Date();
    const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000);

    // Helper function to check a specific ledger
    const checkLedgerLate = async (
      repository: Repository<any>,
      debtType: string,
      currentDebt: number,
    ) => {
      if (currentDebt <= 0) return;

      // Find the latest time the balance was 0 or less
      const lastZeroBalance = await repository.findOne({
        where: { branchId: branch.id },
        order: { createdAt: 'DESC' },
      }); // Wait, we can't easily query 'balanceAfter <= 0' with simple findOne if we just want the latest.
      // Let's use QueryBuilder to get the latest entry where balanceAfter <= 0
      const lastZeroEntry = await repository
        .createQueryBuilder('ledger')
        .where('ledger.branchId = :branchId', { branchId: branch.id })
        .andWhere('ledger.balanceAfter <= 0')
        .orderBy('ledger.createdAt', 'DESC')
        .getOne();

      let startDate: Date;

      if (lastZeroEntry) {
        startDate = lastZeroEntry.createdAt;
      } else {
        // If it was never 0, get the very first charge
        const firstEntry = await repository
          .createQueryBuilder('ledger')
          .where('ledger.branchId = :branchId', { branchId: branch.id })
          .orderBy('ledger.createdAt', 'ASC')
          .getOne();
        if (firstEntry) {
          startDate = firstEntry.createdAt;
        } else {
          return; // No entries
        }
      }

      if (startDate < twentyDaysAgo) {
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        await this.activityService.createNotification({
          branchId: branch.id,
          message: `تنبيه: الفرع (${branch.name}) لديه ديون متأخرة لـ ${debtType} بقيمة ${currentDebt} ج.م منذ أكثر من ${diffDays} يوماً (بداية من ${startDate.toLocaleDateString('ar-EG')}).`,
          type: 'WARNING',
        });
      }
    };

    const summary = await this.getBranchFinancialSummary(branch.id);
    await checkLedgerLate(
      this.royaltyRepository,
      'إيراد الجمعية',
      summary.brandRoyaltyDebt,
    );
    await checkLedgerLate(
      this.debtRepository,
      'توريد البضائع',
      summary.inventoryDebt,
    );
  }

  /**
   * Verifies if the monthly franchise royalty has been applied for the current month.
   * If not, it applies it automatically based on the configured monthlyRoyalty amount of the branch.
   */
  async verifyAndApplyMonthlyRoyalty(branchId: number): Promise<void> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) return;

    const today = new Date();
    // Only apply automated charges on or after the configured due day
    const dueDay = branch.royaltyDueDay || 5;
    if (today.getDate() < dueDay) {
      return;
    }

    const monthStr = `${today.getMonth() + 1}/${today.getFullYear()}`;
    const desc = `حق الامتياز لشهر ${monthStr}`;

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

    const exists = await this.royaltyRepository.findOne({
      where: {
        branchId,
        transactionType: TransactionType.CHARGE,
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    if (!exists && Number(branch.monthlyRoyalty) > 0) {
      const amount = Number(branch.monthlyRoyalty);
      await this.recordRoyaltyCharge(
        {
          branchId,
          amount,
          description: desc,
        },
        'النظام التلقائي',
      );
    }
  }

  /**
   * Records a payment to either the Brand Royalty or Inventory Debt ledger.
   * Wrapped in a strict ACID transaction with locking to ensure correct balances.
   */
  async recordPayment(
    paymentDto: RecordPaymentDto,
    username = 'System',
  ): Promise<BrandRoyaltyLedger | InventoryDebtLedger> {
    const { branchId, ledgerType, amount, description, receiptUrl } =
      paymentDto;
    const finalDescription =
      description?.trim() ||
      (ledgerType === LedgerType.ROYALTY
        ? 'سداد رسوم ملكية'
        : 'سداد ديون توريد');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verify the branch exists
      const branch = await queryRunner.manager.findOne(Branch, {
        where: { id: branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }

      let ledgerEntry: BrandRoyaltyLedger | InventoryDebtLedger;
      const branchName = branch.name;

      if (ledgerType === LedgerType.ROYALTY) {
        // Lock and get the latest royalty ledger entry for this branch
        const lastEntry = await queryRunner.manager.findOne(
          BrandRoyaltyLedger,
          {
            where: { branchId },
            order: { id: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          },
        );

        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        const newBalance = currentBalance - Number(amount); // Payment reduces debt

        ledgerEntry = queryRunner.manager.create(BrandRoyaltyLedger, {
          branchId,
          transactionType: TransactionType.PAYMENT,
          amount: Number(amount),
          balanceAfter: newBalance,
          description: finalDescription,
          receiptUrl: receiptUrl || null,
        });

        await queryRunner.manager.save(ledgerEntry);

        // Audit & Notification
        await this.activityService.createAuditLog(
          username,
          'سداد رسوم ملكية',
          `تم تسجيل سداد دفعة بقيمة ${amount} ج.م من رسوم الملكية المستحقة لـ ${branchName}. الرصيد المتبقي: ${newBalance} ج.م`,
        );

        await this.activityService.createNotification({
          branchId,
          message: `تم سداد دفعة مالية بقيمة ${amount} ج.م بنجاح لحساب رسوم الملكية. رصيدكم الجاري: ${newBalance} ج.م`,
          type: 'SUCCESS',
        });
      } else if (
        ledgerType === LedgerType.INVENTORY_DEBT ||
        (ledgerType as any) === LedgerType.INVENTORY
      ) {
        // Lock and get the latest inventory debt ledger entry for this branch
        const lastEntry = await queryRunner.manager.findOne(
          InventoryDebtLedger,
          {
            where: { branchId },
            order: { id: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          },
        );

        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        const newBalance = currentBalance - Number(amount); // Payment reduces debt

        ledgerEntry = queryRunner.manager.create(InventoryDebtLedger, {
          branchId,
          transactionType: TransactionType.PAYMENT,
          amount: Number(amount),
          balanceAfter: newBalance,
          description: finalDescription,
          receiptUrl: receiptUrl || null,
        });

        if (paymentDto.relatedOrderId) {
          const order = await queryRunner.manager.findOne(PurchaseOrder, {
            where: { id: paymentDto.relatedOrderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order) {
            throw new NotFoundException(
              `Invoice with ID ${paymentDto.relatedOrderId} not found`,
            );
          }
          if (order.branchId !== branchId) {
            throw new BadRequestException(
              'Specified invoice does not belong to this branch',
            );
          }
          order.paidAmount = Number(order.paidAmount) + Number(amount);
          await queryRunner.manager.save(order);

          (ledgerEntry as InventoryDebtLedger).relatedOrderId =
            paymentDto.relatedOrderId;
        }

        await queryRunner.manager.save(ledgerEntry);

        // Audit & Notification
        await this.activityService.createAuditLog(
          username,
          'سداد ديون توريد',
          `تم تسجيل سداد دفعة بقيمة ${amount} ج.م لمديونية المخزون المستحقة لـ ${branchName}. الرصيد المتبقي: ${newBalance} ج.م`,
        );

        await this.activityService.createNotification({
          branchId,
          message: `تم سداد دفعة مالية بقيمة ${amount} ج.م بنجاح لحساب مديونية المخزون. رصيدكم الجاري: ${newBalance} ج.م`,
          type: 'SUCCESS',
        });
      } else {
        throw new BadRequestException('Invalid ledger type specified');
      }

      await queryRunner.commitTransaction();
      this.cacheService.invalidatePattern('finance:summary');
      return ledgerEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Records a Brand Royalty charge to a branch.
   * Wrapped in a transaction with locking.
   */
  async recordRoyaltyCharge(
    chargeDto: RecordChargeDto,
    username = 'System',
  ): Promise<BrandRoyaltyLedger> {
    const { branchId, amount, description } = chargeDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const branch = await queryRunner.manager.findOne(Branch, {
        where: { id: branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }

      const lastEntry = await queryRunner.manager.findOne(BrandRoyaltyLedger, {
        where: { branchId },
        order: { id: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
      const newBalance = currentBalance + Number(amount); // Charge increases debt

      const ledgerEntry = queryRunner.manager.create(BrandRoyaltyLedger, {
        branchId,
        transactionType: TransactionType.CHARGE,
        amount: Number(amount),
        balanceAfter: newBalance,
        description: description,
      });

      const savedEntry = await queryRunner.manager.save(ledgerEntry);

      // Audit & Notification
      await this.activityService.createAuditLog(
        username,
        'قيد رسوم ملكية',
        `تم فرض رسوم حقوق ملكية دورية بقيمة ${amount} ج.م على فرع ${branch.name}. الرصيد المستحق: ${newBalance} ج.م`,
      );

      await this.activityService.createNotification({
        branchId,
        message: `تم قيد رسوم ملكية دورية جديدة على فرعكم بقيمة ${amount} ج.م. الرصيد المستحق: ${newBalance} ج.م`,
        type: 'WARNING',
      });

      await queryRunner.commitTransaction();
      this.cacheService.invalidatePattern('finance:summary');
      return savedEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Fetches paginated Brand Royalty ledger history and the current balance.
   */
  async getRoyaltyLedger(
    branchId: number,
    page = 1,
    limit = 10,
  ): Promise<{
    history: BrandRoyaltyLedger[];
    currentBalance: number;
    total: number;
    page: number;
    limit: number;
  }> {
    await this.verifyAndApplyMonthlyRoyalty(branchId);
    const [history, total] = await this.royaltyRepository.findAndCount({
      where: { branchId },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const lastEntry = await this.royaltyRepository.findOne({
      where: { branchId },
      order: { id: 'DESC' },
    });

    return {
      history,
      currentBalance: lastEntry ? Number(lastEntry.balanceAfter) : 0,
      total,
      page,
      limit,
    };
  }

  /**
   * Fetches paginated Inventory Debt ledger history and the current balance.
   */
  async getInventoryDebtLedger(
    branchId: number,
    page = 1,
    limit = 10,
  ): Promise<{
    history: InventoryDebtLedger[];
    currentBalance: number;
    total: number;
    page: number;
    limit: number;
  }> {
    const [history, total] = await this.debtRepository.findAndCount({
      where: { branchId },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const lastEntry = await this.debtRepository.findOne({
      where: { branchId },
      order: { id: 'DESC' },
    });

    return {
      history,
      currentBalance: lastEntry ? Number(lastEntry.balanceAfter) : 0,
      total,
      page,
      limit,
    };
  }

  /**
   * Returns a summary dashboard for a specific branch with ultra-fast in-memory caching and parallel queries.
   */
  async getBranchFinancialSummary(branchId: number) {
    return this.cacheService.getOrSet(
      `finance:summary:${branchId}`,
      async () => {
        await this.verifyAndApplyMonthlyRoyalty(branchId);

        // Execute all independent summary queries in PARALLEL via Promise.all
        const [
          lastRoyalty,
          lastDebt,
          totalExpensesResult,
          totalRevenueResult,
        ] = await Promise.all([
          this.royaltyRepository.findOne({
            where: { branchId },
            order: { id: 'DESC' },
          }),
          this.debtRepository.findOne({
            where: { branchId },
            order: { id: 'DESC' },
          }),
          this.branchExpenseRepository
            .createQueryBuilder('expense')
            .where('expense.branchId = :branchId', { branchId })
            .select('SUM(expense.amount)', 'total')
            .getRawOne(),
          this.branchDailyRevenueRepository
            .createQueryBuilder('revenue')
            .where('revenue.branchId = :branchId', { branchId })
            .select('SUM(revenue.totalAmount)', 'total')
            .getRawOne(),
        ]);

        const royaltyBalance = lastRoyalty ? Number(lastRoyalty.balanceAfter) : 0;
        const inventoryDebtBalance = lastDebt ? Number(lastDebt.balanceAfter) : 0;

        return {
          branchId,
          brandRoyaltyDebt: royaltyBalance,
          inventoryDebt: inventoryDebtBalance,
          totalOutstandingDebt: royaltyBalance + inventoryDebtBalance,
          totalBranchExpenses: parseFloat(totalExpensesResult?.total || '0'),
          totalBranchRevenues: parseFloat(totalRevenueResult?.total || '0'),
        };
      },
      30, // Cache for 30 seconds
    );
  }

  /**
   * Returns financial summaries for all registered branches in parallel with caching.
   */
  async getAllBranchFinancialSummaries() {
    return this.cacheService.getOrSet(
      'finance:summary:all',
      async () => {
        const branches = await this.branchRepository.find({
          order: { name: 'ASC' },
        });
        return Promise.all(
          branches.map(async (b) => {
            const summary = await this.getBranchFinancialSummary(b.id);
            return {
              ...summary,
              branchName: b.name,
            };
          }),
        );
      },
      30, // Cache for 30 seconds
    );
  }

  /**
   * Fetches all payments recorded across all branches from both ledgers.
   */
  async getAllPayments(): Promise<any[]> {
    const royaltyPayments = await this.royaltyRepository.find({
      where: { transactionType: TransactionType.PAYMENT },
      relations: { branch: true },
      order: { createdAt: 'DESC' },
    });

    const debtPayments = await this.debtRepository.find({
      where: { transactionType: TransactionType.PAYMENT },
      relations: { branch: true },
      order: { createdAt: 'DESC' },
    });

    const customerPayments = await this.customerLedgerRepository.find({
      where: { transactionType: TransactionType.PAYMENT },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
    });



    const combined = [
      ...royaltyPayments.map((p) => ({
        id: `ROY-${p.id}`,
        branchId: p.branchId,
        branchName: p.branch?.name || `فرع #${p.branchId}`,
        ledgerType: 'ROYALTY',
        ledgerName: 'إيراد الجمعية',
        amount: Number(p.amount),
        description: p.description,
        receiptUrl: p.receiptUrl,
        createdAt: p.createdAt,
      })),
      ...debtPayments.map((p) => ({
        id: `DEB-${p.id}`,
        branchId: p.branchId,
        branchName: p.branch?.name || `فرع #${p.branchId}`,
        ledgerType: 'INVENTORY_DEBT',
        ledgerName: 'مديونية البضائع (المخزون)',
        amount: Number(p.amount),
        description: p.description,
        receiptUrl: p.receiptUrl,
        createdAt: p.createdAt,
      })),
      ...customerPayments.map((p) => ({
        id: `CUS-${p.id}`,
        branchId: null,
        branchName: p.customer?.name || `عميل #${p.customerId}`,
        ledgerType: 'CUSTOMER_DEBT',
        ledgerName: 'مدفوعات العملاء',
        amount: Number(p.amount),
        description: p.description,
        receiptUrl: p.receiptUrl,
        createdAt: p.createdAt,
      })),
    ];

    return combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // Liabilities CRUD
  async getLiabilities() {
    return this.liabilityRepository.find({ order: { createdAt: 'DESC' } });
  }

  async addLiability(data: any, username: string = 'System') {
    const liability = this.liabilityRepository.create(data as Partial<Liability>);
    const saved = await this.liabilityRepository.save(liability);
    await this.activityService.createAuditLog(
      username,
      'إضافة التزام مالي',
      `تم تسجيل التزام مالي جديد بقيمة ${saved.amount} (البيان: ${saved.description || 'بدون'})`
    );
    return saved;
  }

  async updateLiability(id: number, data: any) {
    await this.liabilityRepository.update(id, data);
    return this.liabilityRepository.findOne({ where: { id } });
  }

  async deleteLiability(id: number) {
    return this.liabilityRepository.delete(id);
  }

  // Branch Expenses
  async addBranchExpense(branchId: number, data: any) {
    const expense = this.branchExpenseRepository.create({
      ...data,
      branchId,
    });
    const saved = await this.branchExpenseRepository.save(expense);
    this.cacheService.invalidatePattern('finance:summary');
    return saved;
  }

  async getBranchExpenses(branchId?: number) {
    if (branchId) {
      return this.branchExpenseRepository.find({
        where: { branchId },
        order: { createdAt: 'DESC' },
        relations: { branch: true },
      });
    }
    return this.branchExpenseRepository.find({
      order: { createdAt: 'DESC' },
      relations: { branch: true },
    });
  }

  // Branch Daily Revenues
  async addBranchDailyRevenue(branchId: number, data: any) {
    const revenue = this.branchDailyRevenueRepository.create({
      ...data,
      branchId,
    });
    const saved = await this.branchDailyRevenueRepository.save(revenue);
    this.cacheService.invalidatePattern('finance:summary');
    return saved;
  }

  async getBranchDailyRevenues(branchId?: number) {
    if (branchId) {
      return this.branchDailyRevenueRepository.find({
        where: { branchId },
        order: { revenueDate: 'DESC' },
        relations: { branch: true },
      });
    }
    return this.branchDailyRevenueRepository.find({
      order: { revenueDate: 'DESC' },
      relations: { branch: true },
    });
  }
}

