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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../../database/entities/customer.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
const activity_service_1 = require("../activity/activity.service");
let CustomersService = class CustomersService {
    customerRepository;
    ledgerRepository;
    dataSource;
    activityService;
    constructor(customerRepository, ledgerRepository, dataSource, activityService) {
        this.customerRepository = customerRepository;
        this.ledgerRepository = ledgerRepository;
        this.dataSource = dataSource;
        this.activityService = activityService;
    }
    async onApplicationBootstrap() {
        const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
        if (isVercel)
            return;
        await this.checkAllCustomersLateDebt();
    }
    async handleDailyCustomerDebtCheck() {
        await this.checkAllCustomersLateDebt();
    }
    async checkAllCustomersLateDebt() {
        const customers = await this.customerRepository.find({
            where: { currentDebt: (0, typeorm_2.MoreThan)(0) },
        });
        for (const c of customers) {
            if (Number(c.currentDebt) > 0) {
                await this.checkLateCustomerDebtAndNotify(c);
            }
        }
    }
    async checkLateCustomerDebtAndNotify(customer) {
        const today = new Date();
        const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000);
        const lastEntry = await this.ledgerRepository.findOne({
            where: { customerId: customer.id },
            order: { createdAt: 'DESC' },
        });
        if (lastEntry) {
            if (lastEntry.createdAt < twentyDaysAgo) {
                const diffTime = Math.abs(today.getTime() - lastEntry.createdAt.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                await this.activityService.createNotification({
                    message: `تنبيه: العميل (${customer.name}) عليه مديونية بقيمة ${customer.currentDebt} ج.م ولم يقم بأي حركة سداد أو فاتورة منذ أكثر من ${diffDays} يوماً.`,
                    type: 'WARNING',
                });
            }
        }
        else {
            if (customer.createdAt < twentyDaysAgo) {
                const diffTime = Math.abs(today.getTime() - customer.createdAt.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                await this.activityService.createNotification({
                    message: `تنبيه: العميل (${customer.name}) عليه مديونية بقيمة ${customer.currentDebt} ج.م ولم يقم بأي حركة سداد أو فاتورة منذ أكثر من ${diffDays} يوماً.`,
                    type: 'WARNING',
                });
            }
        }
    }
    async create(createCustomerDto, username = 'النظام') {
        const initialDebt = Number(createCustomerDto.initialDebt) || 0;
        const newCustomer = this.customerRepository.create({
            name: createCustomerDto.name.trim(),
            customerCode: createCustomerDto.customerCode?.trim() || undefined,
            phone: createCustomerDto.phone?.trim() || undefined,
            address: createCustomerDto.address?.trim() || undefined,
            notes: createCustomerDto.notes?.trim() || undefined,
            branchId: createCustomerDto.branchId || undefined,
            totalInvoiced: initialDebt > 0 ? initialDebt : 0,
            totalPaid: 0,
            currentDebt: initialDebt > 0 ? initialDebt : 0,
        });
        const savedCustomer = await this.customerRepository.save(newCustomer);
        if (initialDebt > 0) {
            const initialEntry = this.ledgerRepository.create({
                customerId: savedCustomer.id,
                branchId: savedCustomer.branchId,
                transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                amount: initialDebt,
                paidAmount: 0,
                balanceAfter: initialDebt,
                description: 'رصيد افتتاحي مديونية سابقة',
                invoiceDate: new Date().toISOString().split('T')[0],
                recordedBy: username,
            });
            await this.ledgerRepository.save(initialEntry);
        }
        return savedCustomer;
    }
    async findAll(branchId, search, page = 1, limit = 50) {
        const query = this.customerRepository.createQueryBuilder('customer');
        if (branchId) {
            query.andWhere('(customer.branchId = :branchId OR customer.branchId IS NULL)', { branchId });
        }
        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            query.andWhere('(customer.name LIKE :term OR customer.customerCode LIKE :term OR customer.phone LIKE :term)', { term });
        }
        query.orderBy('customer.currentDebt', 'DESC');
        query.addOrderBy('customer.updatedAt', 'DESC');
        const totalCount = await query.getCount();
        const data = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();
        const summaryQuery = this.customerRepository.createQueryBuilder('customer');
        if (branchId) {
            summaryQuery.andWhere('(customer.branchId = :branchId OR customer.branchId IS NULL)', { branchId });
        }
        const rawSummary = await summaryQuery
            .select('SUM(customer.totalInvoiced)', 'totalInvoiced')
            .addSelect('SUM(customer.totalPaid)', 'totalPaid')
            .addSelect('SUM(customer.currentDebt)', 'totalCurrentDebt')
            .addSelect('COUNT(customer.id)', 'count')
            .getRawOne();
        return {
            data,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
            summary: {
                totalCustomers: Number(rawSummary?.count) || 0,
                totalInvoiced: Number(rawSummary?.totalInvoiced) || 0,
                totalPaid: Number(rawSummary?.totalPaid) || 0,
                totalCurrentDebt: Number(rawSummary?.totalCurrentDebt) || 0,
            },
        };
    }
    async findOne(id) {
        const customer = await this.customerRepository.findOne({ where: { id } });
        if (!customer) {
            throw new common_1.NotFoundException(`العميل برقم ${id} غير موجود`);
        }
        return customer;
    }
    async update(id, updateCustomerDto) {
        const customer = await this.findOne(id);
        if (updateCustomerDto.name !== undefined)
            customer.name = updateCustomerDto.name.trim();
        if (updateCustomerDto.phone !== undefined)
            customer.phone = updateCustomerDto.phone?.trim() || undefined;
        if (updateCustomerDto.address !== undefined)
            customer.address = updateCustomerDto.address?.trim() || undefined;
        if (updateCustomerDto.customerCode !== undefined)
            customer.customerCode = updateCustomerDto.customerCode?.trim() || undefined;
        if (updateCustomerDto.notes !== undefined)
            customer.notes = updateCustomerDto.notes?.trim() || undefined;
        return this.customerRepository.save(customer);
    }
    async remove(id) {
        const customer = await this.findOne(id);
        if (Number(customer.currentDebt) !== 0) {
            throw new common_1.BadRequestException('لا يمكن حذف العميل لوجود مديونية قائمة في حسابه');
        }
        await this.customerRepository.remove(customer);
        return { success: true, message: 'تم حذف العميل بنجاح' };
    }
    async recordInvoice(customerId, dto, username = 'النظام') {
        const customer = await this.findOne(customerId);
        const totalAmount = Number(dto.totalAmount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new common_1.BadRequestException('يجب أن يكون إجمالي مبلغ الفاتورة أكبر من 0');
        }
        const paidAmount = Math.max(0, Number(dto.paidAmount) || 0);
        const invoiceDate = dto.invoiceDate || new Date().toISOString().split('T')[0];
        const prevDebt = Number(customer.currentDebt) || 0;
        const afterInvoiceDebt = prevDebt + totalAmount;
        const invoiceEntry = this.ledgerRepository.create({
            customerId: customer.id,
            branchId: dto.branchId || customer.branchId,
            transactionType: transaction_type_enum_1.TransactionType.CHARGE,
            invoiceNumber: dto.invoiceNumber?.trim() || undefined,
            amount: totalAmount,
            paidAmount: paidAmount,
            balanceAfter: afterInvoiceDebt,
            description: dto.notes?.trim() || `فاتورة مبيعات للعميل${dto.invoiceNumber ? ` #${dto.invoiceNumber}` : ''}`,
            invoiceDate: invoiceDate,
            paymentMethod: dto.paymentMethod || 'نقدي',
            recordedBy: username,
        });
        await this.ledgerRepository.save(invoiceEntry);
        let finalDebt = afterInvoiceDebt;
        if (paidAmount > 0) {
            finalDebt = afterInvoiceDebt - paidAmount;
            const paymentEntry = this.ledgerRepository.create({
                customerId: customer.id,
                branchId: dto.branchId || customer.branchId,
                transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                invoiceNumber: dto.invoiceNumber?.trim() || undefined,
                amount: paidAmount,
                paidAmount: paidAmount,
                balanceAfter: finalDebt,
                paymentMethod: dto.paymentMethod || 'نقدي',
                description: `سداد فوري مع الفاتورة${dto.invoiceNumber ? ` #${dto.invoiceNumber}` : ''}`,
                invoiceDate: invoiceDate,
                recordedBy: username,
            });
            await this.ledgerRepository.save(paymentEntry);
        }
        customer.totalInvoiced = Number(customer.totalInvoiced || 0) + totalAmount;
        customer.totalPaid = Number(customer.totalPaid || 0) + paidAmount;
        customer.currentDebt = Number(customer.totalInvoiced) - Number(customer.totalPaid);
        const savedCustomer = await this.customerRepository.save(customer);
        return {
            success: true,
            customer: savedCustomer,
            recordedInvoice: invoiceEntry,
            newDebt: savedCustomer.currentDebt,
        };
    }
    async registerPayment(id, paymentDto, username = 'النظام') {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const customer = await queryRunner.manager.findOne(customer_entity_1.Customer, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`العميل برقم ${id} غير موجود`);
            }
            const amount = Number(paymentDto.amount);
            if (isNaN(amount) || amount <= 0) {
                throw new common_1.BadRequestException('يجب أن يكون مبلغ الدفعة أكبر من 0');
            }
            const currentBalance = Number(customer.currentDebt) || 0;
            const newBalance = currentBalance - amount;
            const paymentDate = paymentDto.paymentDate || new Date().toISOString().split('T')[0];
            const ledgerEntry = queryRunner.manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                customerId: id,
                branchId: paymentDto.branchId || customer.branchId,
                transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                amount: amount,
                paidAmount: amount,
                balanceAfter: newBalance,
                paymentMethod: paymentDto.paymentMethod || 'نقدي',
                description: paymentDto.notes?.trim() ||
                    paymentDto.description?.trim() ||
                    (paymentDto.receiptNumber ? `سند قبض نقدية #${paymentDto.receiptNumber}` : 'سداد دفعة من الحساب'),
                invoiceDate: paymentDate,
                recordedBy: username,
                receiptUrl: paymentDto.receiptUrl,
            });
            await queryRunner.manager.save(ledgerEntry);
            customer.totalPaid = Number(customer.totalPaid || 0) + amount;
            customer.currentDebt = Number(customer.totalInvoiced || 0) - Number(customer.totalPaid);
            await queryRunner.manager.save(customer);
            await this.activityService.createAuditLog(username, 'تسجيل مدفوعات عميل', `تم استلام مبلغ ${amount} ج.م من العميل ${customer.name}. الرصيد الحالي: ${customer.currentDebt} ج.م`);
            await queryRunner.commitTransaction();
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
    async getStatement(id, page = 1, limit = 100) {
        const customer = await this.findOne(id);
        const [history, total] = await this.ledgerRepository.findAndCount({
            where: { customerId: customer.id },
            relations: {
                relatedOrder: true,
                relatedSale: { items: { product: true } },
            },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            customer,
            history,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
            summary: {
                totalInvoiced: Number(customer.totalInvoiced) || 0,
                totalPaid: Number(customer.totalPaid) || 0,
                currentDebt: Number(customer.currentDebt) || 0,
            },
        };
    }
    async getLedger(id, page = 1, limit = 100) {
        return this.getStatement(id, page, limit);
    }
};
exports.CustomersService = CustomersService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomersService.prototype, "handleDailyCustomerDebtCheck", null);
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_debt_ledger_entity_1.CustomerDebtLedger)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        activity_service_1.ActivityService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map