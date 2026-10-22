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
var FinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const brand_royalty_ledger_entity_1 = require("../../database/entities/brand-royalty-ledger.entity");
const inventory_debt_ledger_entity_1 = require("../../database/entities/inventory-debt-ledger.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
const branch_entity_1 = require("../../database/entities/branch.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
const activity_service_1 = require("../activity/activity.service");
const liability_entity_1 = require("../../database/entities/liability.entity");
const branch_expense_entity_1 = require("../../database/entities/branch-expense.entity");
const branch_daily_revenue_entity_1 = require("../../database/entities/branch-daily-revenue.entity");
const cache_service_1 = require("../../common/services/cache.service");
let FinanceService = FinanceService_1 = class FinanceService {
    royaltyRepository;
    debtRepository;
    customerLedgerRepository;
    branchRepository;
    liabilityRepository;
    branchExpenseRepository;
    branchDailyRevenueRepository;
    dataSource;
    activityService;
    cacheService;
    async recalculateLedger(ledgerType, idParam) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            let repo;
            let whereClause;
            if (ledgerType === 'ROYALTY') {
                repo = queryRunner.manager.getRepository(brand_royalty_ledger_entity_1.BrandRoyaltyLedger);
                whereClause = { branchId: idParam };
            }
            else if (ledgerType === 'INVENTORY_DEBT') {
                repo = queryRunner.manager.getRepository(inventory_debt_ledger_entity_1.InventoryDebtLedger);
                whereClause = { branchId: idParam };
            }
            else {
                repo = queryRunner.manager.getRepository(customer_debt_ledger_entity_1.CustomerDebtLedger);
                whereClause = { customerId: idParam };
            }
            const records = await repo.find({
                where: whereClause,
                order: { id: 'ASC' },
                lock: { mode: 'pessimistic_write' }
            });
            let currentBalance = 0;
            for (const record of records) {
                if (record.transactionType === transaction_type_enum_1.TransactionType.CHARGE) {
                    currentBalance += Number(record.amount);
                }
                else if (record.transactionType === transaction_type_enum_1.TransactionType.PAYMENT) {
                    currentBalance -= Number(record.amount);
                }
                record.balanceAfter = currentBalance;
                await repo.save(record);
            }
            if (ledgerType === 'CUSTOMER_DEBT') {
                const customer = await queryRunner.manager.findOne(customer_entity_1.Customer, { where: { id: idParam } });
                if (customer) {
                    customer.currentDebt = currentBalance;
                    await queryRunner.manager.save(customer);
                }
            }
            else if (ledgerType === 'ROYALTY') {
                const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, { where: { id: idParam } });
                if (branch) {
                    const summaries = await queryRunner.manager.query(`SELECT * FROM branch_revenues WHERE branchId = ?`, [idParam]);
                    if (summaries && summaries.length > 0) {
                        await queryRunner.manager.query(`UPDATE branch_revenues SET brandRoyaltyDebt = ? WHERE branchId = ?`, [currentBalance, idParam]);
                    }
                }
            }
            else if (ledgerType === 'INVENTORY_DEBT') {
                const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, { where: { id: idParam } });
                if (branch) {
                    const summaries = await queryRunner.manager.query(`SELECT * FROM branch_revenues WHERE branchId = ?`, [idParam]);
                    if (summaries && summaries.length > 0) {
                        await queryRunner.manager.query(`UPDATE branch_revenues SET currentInventoryDebt = ? WHERE branchId = ?`, [currentBalance, idParam]);
                    }
                }
            }
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
    async updatePayment(ledgerType, paymentId, dto, username) {
        let record;
        let idParam;
        if (ledgerType === 'ROYALTY') {
            record = await this.royaltyRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.branchId;
            record.amount = dto.amount;
            if (dto.description)
                record.description = dto.description;
            if (dto.createdAt)
                record.createdAt = dto.createdAt;
            await this.royaltyRepository.save(record);
        }
        else if (ledgerType === 'INVENTORY_DEBT') {
            record = await this.debtRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.branchId;
            record.amount = dto.amount;
            if (dto.description)
                record.description = dto.description;
            if (dto.createdAt)
                record.createdAt = dto.createdAt;
            await this.debtRepository.save(record);
        }
        else {
            record = await this.customerLedgerRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.customerId;
            record.amount = dto.amount;
            if (dto.description)
                record.description = dto.description;
            if (dto.createdAt)
                record.createdAt = dto.createdAt;
            await this.customerLedgerRepository.save(record);
        }
        await this.recalculateLedger(ledgerType, idParam);
        await this.activityService.createAuditLog(username, 'تعديل سداد مالي', `تم تعديل سداد مالي ليكون بقيمة ${record.amount} في ${ledgerType}`);
    }
    async deletePayment(ledgerType, paymentId, username) {
        let record;
        let idParam;
        if (ledgerType === 'ROYALTY') {
            record = await this.royaltyRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.branchId;
            await this.royaltyRepository.remove(record);
        }
        else if (ledgerType === 'INVENTORY_DEBT') {
            record = await this.debtRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.branchId;
            await this.debtRepository.remove(record);
        }
        else {
            record = await this.customerLedgerRepository.findOne({ where: { id: paymentId } });
            if (!record)
                throw new common_1.NotFoundException('Payment not found');
            idParam = record.customerId;
            await this.customerLedgerRepository.remove(record);
        }
        await this.recalculateLedger(ledgerType, idParam);
        await this.activityService.createAuditLog(username, 'حذف سداد مالي', `تم حذف سداد مالي بقيمة ${record.amount} من ${ledgerType}`);
    }
    logger = new common_1.Logger(FinanceService_1.name);
    constructor(royaltyRepository, debtRepository, customerLedgerRepository, branchRepository, liabilityRepository, branchExpenseRepository, branchDailyRevenueRepository, dataSource, activityService, cacheService) {
        this.royaltyRepository = royaltyRepository;
        this.debtRepository = debtRepository;
        this.customerLedgerRepository = customerLedgerRepository;
        this.branchRepository = branchRepository;
        this.liabilityRepository = liabilityRepository;
        this.branchExpenseRepository = branchExpenseRepository;
        this.branchDailyRevenueRepository = branchDailyRevenueRepository;
        this.dataSource = dataSource;
        this.activityService = activityService;
        this.cacheService = cacheService;
    }
    onApplicationBootstrap() {
        setImmediate(async () => {
            try {
                const branches = await this.branchRepository.find();
                await Promise.all(branches.map(async (b) => {
                    await this.verifyAndApplyMonthlyRoyalty(b.id);
                    await this.checkLateDebtsAndNotify(b);
                }));
            }
            catch (err) {
                this.logger.error('Error in onApplicationBootstrap for monthly royalties:', err);
            }
        });
    }
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
        }
        catch (err) {
            this.logger.error('Error in handleDailyRoyaltyCheck', err);
        }
    }
    async checkLateDebtsAndNotify(branch) {
        const today = new Date();
        const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000);
        const checkLedgerLate = async (repository, debtType, currentDebt) => {
            if (currentDebt <= 0)
                return;
            const lastZeroBalance = await repository.findOne({
                where: { branchId: branch.id },
                order: { createdAt: 'DESC' },
            });
            const lastZeroEntry = await repository
                .createQueryBuilder('ledger')
                .where('ledger.branchId = :branchId', { branchId: branch.id })
                .andWhere('ledger.balanceAfter <= 0')
                .orderBy('ledger.createdAt', 'DESC')
                .getOne();
            let startDate;
            if (lastZeroEntry) {
                startDate = lastZeroEntry.createdAt;
            }
            else {
                const firstEntry = await repository
                    .createQueryBuilder('ledger')
                    .where('ledger.branchId = :branchId', { branchId: branch.id })
                    .orderBy('ledger.createdAt', 'ASC')
                    .getOne();
                if (firstEntry) {
                    startDate = firstEntry.createdAt;
                }
                else {
                    return;
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
        await checkLedgerLate(this.royaltyRepository, 'إيراد الجمعية', summary.brandRoyaltyDebt);
        await checkLedgerLate(this.debtRepository, 'توريد البضائع', summary.inventoryDebt);
    }
    async verifyAndApplyMonthlyRoyalty(branchId) {
        const branch = await this.branchRepository.findOne({
            where: { id: branchId },
        });
        if (!branch)
            return;
        const today = new Date();
        const dueDay = branch.royaltyDueDay || 5;
        if (today.getDate() < dueDay) {
            return;
        }
        const monthStr = `${today.getMonth() + 1}/${today.getFullYear()}`;
        const desc = `حق الامتياز لشهر ${monthStr}`;
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const exists = await this.royaltyRepository.findOne({
            where: {
                branchId,
                transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                createdAt: (0, typeorm_2.Between)(startOfMonth, endOfMonth),
            },
        });
        if (!exists && Number(branch.monthlyRoyalty) > 0) {
            const amount = Number(branch.monthlyRoyalty);
            await this.recordRoyaltyCharge({
                branchId,
                amount,
                description: desc,
            }, 'النظام التلقائي');
        }
    }
    async recordPayment(paymentDto, username = 'System') {
        const { branchId, ledgerType, amount, description, receiptUrl } = paymentDto;
        const finalDescription = description?.trim() ||
            (ledgerType === record_payment_dto_1.LedgerType.ROYALTY
                ? 'سداد رسوم ملكية'
                : 'سداد ديون توريد');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, {
                where: { id: branchId },
            });
            if (!branch) {
                throw new common_1.NotFoundException(`Branch with ID ${branchId} not found`);
            }
            let ledgerEntry;
            const branchName = branch.name;
            if (ledgerType === record_payment_dto_1.LedgerType.ROYALTY) {
                const lastEntry = await queryRunner.manager.findOne(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, {
                    where: { branchId },
                    order: { id: 'DESC' },
                    lock: { mode: 'pessimistic_write' },
                });
                const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
                const newBalance = currentBalance - Number(amount);
                ledgerEntry = queryRunner.manager.create(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, {
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                    amount: Number(amount),
                    balanceAfter: newBalance,
                    description: finalDescription,
                    receiptUrl: receiptUrl || null,
                });
                await queryRunner.manager.save(ledgerEntry);
                await this.activityService.createAuditLog(username, 'سداد رسوم ملكية', `تم تسجيل سداد دفعة بقيمة ${amount} ج.م من رسوم الملكية المستحقة لـ ${branchName}. الرصيد المتبقي: ${newBalance} ج.م`);
                await this.activityService.createNotification({
                    branchId,
                    message: `تم سداد دفعة مالية بقيمة ${amount} ج.م بنجاح لحساب رسوم الملكية. رصيدكم الجاري: ${newBalance} ج.م`,
                    type: 'SUCCESS',
                });
            }
            else if (ledgerType === record_payment_dto_1.LedgerType.INVENTORY_DEBT ||
                ledgerType === record_payment_dto_1.LedgerType.INVENTORY) {
                const lastEntry = await queryRunner.manager.findOne(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    where: { branchId },
                    order: { id: 'DESC' },
                    lock: { mode: 'pessimistic_write' },
                });
                const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
                const newBalance = currentBalance - Number(amount);
                ledgerEntry = queryRunner.manager.create(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                    amount: Number(amount),
                    balanceAfter: newBalance,
                    description: finalDescription,
                    receiptUrl: receiptUrl || null,
                });
                if (paymentDto.relatedOrderId) {
                    const order = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                        where: { id: paymentDto.relatedOrderId },
                        lock: { mode: 'pessimistic_write' },
                    });
                    if (!order) {
                        throw new common_1.NotFoundException(`Invoice with ID ${paymentDto.relatedOrderId} not found`);
                    }
                    if (order.branchId !== branchId) {
                        throw new common_1.BadRequestException('Specified invoice does not belong to this branch');
                    }
                    order.paidAmount = Number(order.paidAmount) + Number(amount);
                    await queryRunner.manager.save(order);
                    ledgerEntry.relatedOrderId =
                        paymentDto.relatedOrderId;
                }
                await queryRunner.manager.save(ledgerEntry);
                await this.activityService.createAuditLog(username, 'سداد ديون توريد', `تم تسجيل سداد دفعة بقيمة ${amount} ج.م لمديونية المخزون المستحقة لـ ${branchName}. الرصيد المتبقي: ${newBalance} ج.م`);
                await this.activityService.createNotification({
                    branchId,
                    message: `تم سداد دفعة مالية بقيمة ${amount} ج.م بنجاح لحساب مديونية المخزون. رصيدكم الجاري: ${newBalance} ج.م`,
                    type: 'SUCCESS',
                });
            }
            else {
                throw new common_1.BadRequestException('Invalid ledger type specified');
            }
            await queryRunner.commitTransaction();
            this.cacheService.invalidatePattern('finance:summary');
            return ledgerEntry;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async recordRoyaltyCharge(chargeDto, username = 'System') {
        const { branchId, amount, description } = chargeDto;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, {
                where: { id: branchId },
            });
            if (!branch) {
                throw new common_1.NotFoundException(`Branch with ID ${branchId} not found`);
            }
            const lastEntry = await queryRunner.manager.findOne(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, {
                where: { branchId },
                order: { id: 'DESC' },
                lock: { mode: 'pessimistic_write' },
            });
            const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
            const newBalance = currentBalance + Number(amount);
            const ledgerEntry = queryRunner.manager.create(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, {
                branchId,
                transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                amount: Number(amount),
                balanceAfter: newBalance,
                description: description,
            });
            const savedEntry = await queryRunner.manager.save(ledgerEntry);
            await this.activityService.createAuditLog(username, 'قيد رسوم ملكية', `تم فرض رسوم حقوق ملكية دورية بقيمة ${amount} ج.م على فرع ${branch.name}. الرصيد المستحق: ${newBalance} ج.م`);
            await this.activityService.createNotification({
                branchId,
                message: `تم قيد رسوم ملكية دورية جديدة على فرعكم بقيمة ${amount} ج.م. الرصيد المستحق: ${newBalance} ج.م`,
                type: 'WARNING',
            });
            await queryRunner.commitTransaction();
            this.cacheService.invalidatePattern('finance:summary');
            return savedEntry;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getRoyaltyLedger(branchId, page = 1, limit = 10) {
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
    async getInventoryDebtLedger(branchId, page = 1, limit = 10) {
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
    async getBranchFinancialSummary(branchId) {
        return this.cacheService.getOrSet(`finance:summary:${branchId}`, async () => {
            await this.verifyAndApplyMonthlyRoyalty(branchId);
            const [lastRoyalty, lastDebt, totalExpensesResult, totalRevenueResult,] = await Promise.all([
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
        }, 30);
    }
    async getAllBranchFinancialSummaries() {
        return this.cacheService.getOrSet('finance:summary:all', async () => {
            const branches = await this.branchRepository.find({
                order: { name: 'ASC' },
            });
            return Promise.all(branches.map(async (b) => {
                const summary = await this.getBranchFinancialSummary(b.id);
                return {
                    ...summary,
                    branchName: b.name,
                };
            }));
        }, 30);
    }
    async getAllPayments() {
        const royaltyPayments = await this.royaltyRepository.find({
            where: { transactionType: transaction_type_enum_1.TransactionType.PAYMENT },
            relations: { branch: true },
            order: { createdAt: 'DESC' },
        });
        const debtPayments = await this.debtRepository.find({
            where: { transactionType: transaction_type_enum_1.TransactionType.PAYMENT },
            relations: { branch: true },
            order: { createdAt: 'DESC' },
        });
        const customerPayments = await this.customerLedgerRepository.find({
            where: { transactionType: transaction_type_enum_1.TransactionType.PAYMENT },
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
        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async getLiabilities() {
        return this.liabilityRepository.find({ order: { createdAt: 'DESC' } });
    }
    async addLiability(data, username = 'System') {
        const liability = this.liabilityRepository.create(data);
        const saved = await this.liabilityRepository.save(liability);
        await this.activityService.createAuditLog(username, 'إضافة التزام مالي', `تم تسجيل التزام مالي جديد بقيمة ${saved.amount} (البيان: ${saved.description || 'بدون'})`);
        return saved;
    }
    async updateLiability(id, data) {
        await this.liabilityRepository.update(id, data);
        return this.liabilityRepository.findOne({ where: { id } });
    }
    async deleteLiability(id) {
        return this.liabilityRepository.delete(id);
    }
    async addBranchExpense(branchId, data) {
        const expense = this.branchExpenseRepository.create({
            ...data,
            branchId,
        });
        const saved = await this.branchExpenseRepository.save(expense);
        this.cacheService.invalidatePattern('finance:summary');
        return saved;
    }
    async getBranchExpenses(branchId) {
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
    async addBranchDailyRevenue(branchId, data) {
        const revenue = this.branchDailyRevenueRepository.create({
            ...data,
            branchId,
        });
        const saved = await this.branchDailyRevenueRepository.save(revenue);
        this.cacheService.invalidatePattern('finance:summary');
        return saved;
    }
    async getBranchDailyRevenues(branchId) {
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
};
exports.FinanceService = FinanceService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceService.prototype, "handleDailyRoyaltyCheck", null);
exports.FinanceService = FinanceService = FinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(brand_royalty_ledger_entity_1.BrandRoyaltyLedger)),
    __param(1, (0, typeorm_1.InjectRepository)(inventory_debt_ledger_entity_1.InventoryDebtLedger)),
    __param(2, (0, typeorm_1.InjectRepository)(customer_debt_ledger_entity_1.CustomerDebtLedger)),
    __param(3, (0, typeorm_1.InjectRepository)(branch_entity_1.Branch)),
    __param(4, (0, typeorm_1.InjectRepository)(liability_entity_1.Liability)),
    __param(5, (0, typeorm_1.InjectRepository)(branch_expense_entity_1.BranchExpense)),
    __param(6, (0, typeorm_1.InjectRepository)(branch_daily_revenue_entity_1.BranchDailyRevenue)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        activity_service_1.ActivityService,
        cache_service_1.MemoryCacheService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map