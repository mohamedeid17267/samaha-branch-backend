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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
const supplier_debt_ledger_entity_1 = require("../../database/entities/supplier-debt-ledger.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
let SuppliersService = class SuppliersService {
    supplierRepo;
    ledgerRepo;
    constructor(supplierRepo, ledgerRepo) {
        this.supplierRepo = supplierRepo;
        this.ledgerRepo = ledgerRepo;
    }
    async create(dto, username) {
        const initialDebt = Number(dto.initialDebt) || 0;
        const newSupplier = new supplier_entity_1.Supplier();
        newSupplier.name = dto.name.trim();
        newSupplier.supplierCode = dto.supplierCode?.trim() || undefined;
        newSupplier.phone = dto.phone?.trim() || undefined;
        newSupplier.address = dto.address?.trim() || undefined;
        newSupplier.notes = dto.notes?.trim() || undefined;
        newSupplier.branchId = dto.branchId || undefined;
        newSupplier.totalInvoiced = initialDebt > 0 ? initialDebt : 0;
        newSupplier.totalPaid = 0;
        newSupplier.currentDebt = initialDebt > 0 ? initialDebt : 0;
        const savedSupplier = await this.supplierRepo.save(newSupplier);
        if (initialDebt > 0) {
            const initialEntry = new supplier_debt_ledger_entity_1.SupplierDebtLedger();
            initialEntry.supplierId = savedSupplier.id;
            initialEntry.branchId = savedSupplier.branchId;
            initialEntry.transactionType = transaction_type_enum_1.TransactionType.CHARGE;
            initialEntry.amount = initialDebt;
            initialEntry.paidAmount = 0;
            initialEntry.balanceAfter = initialDebt;
            initialEntry.description = 'رصيد افتتاحي مديونية سابقة';
            initialEntry.invoiceDate = new Date().toISOString().split('T')[0];
            initialEntry.recordedBy = username || 'المدير';
            await this.ledgerRepo.save(initialEntry);
        }
        return savedSupplier;
    }
    async findAll(branchId, search, page = 1, limit = 50) {
        const queryBuilder = this.supplierRepo.createQueryBuilder('supplier');
        if (branchId) {
            queryBuilder.andWhere('(supplier.branchId = :branchId OR supplier.branchId IS NULL)', { branchId });
        }
        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            queryBuilder.andWhere('(supplier.name LIKE :term OR supplier.supplierCode LIKE :term OR supplier.phone LIKE :term)', { term });
        }
        queryBuilder.orderBy('supplier.currentDebt', 'DESC');
        queryBuilder.addOrderBy('supplier.updatedAt', 'DESC');
        const totalCount = await queryBuilder.getCount();
        const data = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();
        const summaryQuery = this.supplierRepo.createQueryBuilder('supplier');
        if (branchId) {
            summaryQuery.andWhere('(supplier.branchId = :branchId OR supplier.branchId IS NULL)', { branchId });
        }
        const rawSummary = await summaryQuery
            .select('SUM(supplier.totalInvoiced)', 'totalInvoiced')
            .addSelect('SUM(supplier.totalPaid)', 'totalPaid')
            .addSelect('SUM(supplier.currentDebt)', 'totalCurrentDebt')
            .addSelect('COUNT(supplier.id)', 'count')
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
                totalSuppliers: Number(rawSummary?.count) || 0,
                totalInvoiced: Number(rawSummary?.totalInvoiced) || 0,
                totalPaid: Number(rawSummary?.totalPaid) || 0,
                totalCurrentDebt: Number(rawSummary?.totalCurrentDebt) || 0,
            },
        };
    }
    async findOne(id) {
        const supplier = await this.supplierRepo.findOne({ where: { id } });
        if (!supplier) {
            throw new common_1.NotFoundException(`المورد برقم ${id} غير موجود`);
        }
        return supplier;
    }
    async update(id, dto) {
        const supplier = await this.findOne(id);
        if (dto.name !== undefined)
            supplier.name = dto.name.trim();
        if (dto.supplierCode !== undefined)
            supplier.supplierCode = dto.supplierCode?.trim() || undefined;
        if (dto.phone !== undefined)
            supplier.phone = dto.phone?.trim() || undefined;
        if (dto.address !== undefined)
            supplier.address = dto.address?.trim() || undefined;
        if (dto.notes !== undefined)
            supplier.notes = dto.notes?.trim() || undefined;
        return this.supplierRepo.save(supplier);
    }
    async remove(id) {
        const supplier = await this.findOne(id);
        await this.supplierRepo.remove(supplier);
        return { success: true, message: 'تم حذف المورد بنجاح' };
    }
    async recordInvoice(supplierId, dto, username) {
        const supplier = await this.findOne(supplierId);
        const totalAmount = Number(dto.totalAmount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new common_1.BadRequestException('يجب أن يكون إجمالي مبلغ الفاتورة أكبر من 0');
        }
        const paidAmount = Math.max(0, Number(dto.paidAmount) || 0);
        const invoiceDate = dto.invoiceDate || new Date().toISOString().split('T')[0];
        const prevDebt = Number(supplier.currentDebt) || 0;
        const afterInvoiceDebt = prevDebt + totalAmount;
        const invoiceEntry = new supplier_debt_ledger_entity_1.SupplierDebtLedger();
        invoiceEntry.supplierId = supplier.id;
        invoiceEntry.branchId = dto.branchId || supplier.branchId;
        invoiceEntry.transactionType = transaction_type_enum_1.TransactionType.CHARGE;
        invoiceEntry.invoiceNumber = dto.invoiceNumber?.trim() || undefined;
        invoiceEntry.amount = totalAmount;
        invoiceEntry.paidAmount = paidAmount;
        invoiceEntry.balanceAfter = afterInvoiceDebt;
        invoiceEntry.description = dto.notes?.trim() || `فاتورة توريد بضاعة${dto.invoiceNumber ? ` #${dto.invoiceNumber}` : ''}`;
        invoiceEntry.invoiceDate = invoiceDate;
        invoiceEntry.recordedBy = username || 'المستخدم';
        await this.ledgerRepo.save(invoiceEntry);
        let finalDebt = afterInvoiceDebt;
        if (paidAmount > 0) {
            finalDebt = afterInvoiceDebt - paidAmount;
            const paymentEntry = new supplier_debt_ledger_entity_1.SupplierDebtLedger();
            paymentEntry.supplierId = supplier.id;
            paymentEntry.branchId = dto.branchId || supplier.branchId;
            paymentEntry.transactionType = transaction_type_enum_1.TransactionType.PAYMENT;
            paymentEntry.invoiceNumber = dto.invoiceNumber?.trim() || undefined;
            paymentEntry.amount = paidAmount;
            paymentEntry.paidAmount = paidAmount;
            paymentEntry.balanceAfter = finalDebt;
            paymentEntry.paymentMethod = dto.paymentMethod || 'نقدي';
            paymentEntry.description = `دفعة مسددة مع الفاتورة${dto.invoiceNumber ? ` #${dto.invoiceNumber}` : ''}`;
            paymentEntry.invoiceDate = invoiceDate;
            paymentEntry.recordedBy = username || 'المستخدم';
            await this.ledgerRepo.save(paymentEntry);
        }
        supplier.totalInvoiced = Number(supplier.totalInvoiced) + totalAmount;
        supplier.totalPaid = Number(supplier.totalPaid) + paidAmount;
        supplier.currentDebt = Number(supplier.totalInvoiced) - Number(supplier.totalPaid);
        const savedSupplier = await this.supplierRepo.save(supplier);
        return {
            success: true,
            supplier: savedSupplier,
            recordedInvoice: invoiceEntry,
            newDebt: savedSupplier.currentDebt,
        };
    }
    async recordPayment(supplierId, dto, username) {
        const supplier = await this.findOne(supplierId);
        const amount = Number(dto.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new common_1.BadRequestException('يجب أن يكون مبلغ الدفعة أكبر من 0');
        }
        const prevDebt = Number(supplier.currentDebt) || 0;
        const finalDebt = prevDebt - amount;
        const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
        const paymentEntry = new supplier_debt_ledger_entity_1.SupplierDebtLedger();
        paymentEntry.supplierId = supplier.id;
        paymentEntry.branchId = dto.branchId || supplier.branchId;
        paymentEntry.transactionType = transaction_type_enum_1.TransactionType.PAYMENT;
        paymentEntry.amount = amount;
        paymentEntry.paidAmount = amount;
        paymentEntry.balanceAfter = finalDebt;
        paymentEntry.paymentMethod = dto.paymentMethod || 'نقدي';
        paymentEntry.description =
            dto.notes?.trim() ||
                (dto.receiptNumber ? `سند صرف نقدية #${dto.receiptNumber}` : 'سداد دفعة للمورد');
        paymentEntry.invoiceDate = paymentDate;
        paymentEntry.recordedBy = username || 'المستخدم';
        await this.ledgerRepo.save(paymentEntry);
        supplier.totalPaid = Number(supplier.totalPaid) + amount;
        supplier.currentDebt = Number(supplier.totalInvoiced) - Number(supplier.totalPaid);
        const savedSupplier = await this.supplierRepo.save(supplier);
        return {
            success: true,
            supplier: savedSupplier,
            payment: paymentEntry,
            newDebt: savedSupplier.currentDebt,
        };
    }
    async getLedger(supplierId, page = 1, limit = 100) {
        const supplier = await this.findOne(supplierId);
        const [history, total] = await this.ledgerRepo.findAndCount({
            where: { supplierId: supplier.id },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            supplier,
            history,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
            summary: {
                totalInvoiced: Number(supplier.totalInvoiced) || 0,
                totalPaid: Number(supplier.totalPaid) || 0,
                currentDebt: Number(supplier.currentDebt) || 0,
            },
        };
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(1, (0, typeorm_1.InjectRepository)(supplier_debt_ledger_entity_1.SupplierDebtLedger)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map