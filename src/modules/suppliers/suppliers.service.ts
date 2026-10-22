import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierDebtLedger } from '../../database/entities/supplier-debt-ledger.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierInvoiceDto } from './dto/supplier-invoice.dto';
import { SupplierPaymentDto } from './dto/supplier-payment.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierDebtLedger)
    private readonly ledgerRepo: Repository<SupplierDebtLedger>,
  ) {}

  async create(dto: CreateSupplierDto, username?: string): Promise<Supplier> {
    const initialDebt = Number(dto.initialDebt) || 0;

    const newSupplier = new Supplier();
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
      const initialEntry = new SupplierDebtLedger();
      initialEntry.supplierId = savedSupplier.id;
      initialEntry.branchId = savedSupplier.branchId;
      initialEntry.transactionType = TransactionType.CHARGE;
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

  async findAll(
    branchId?: number,
    search?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const queryBuilder = this.supplierRepo.createQueryBuilder('supplier');

    if (branchId) {
      queryBuilder.andWhere(
        '(supplier.branchId = :branchId OR supplier.branchId IS NULL)',
        { branchId },
      );
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(supplier.name LIKE :term OR supplier.supplierCode LIKE :term OR supplier.phone LIKE :term)',
        { term },
      );
    }

    queryBuilder.orderBy('supplier.currentDebt', 'DESC');
    queryBuilder.addOrderBy('supplier.updatedAt', 'DESC');

    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Summary totals for all matching suppliers
    const summaryQuery = this.supplierRepo.createQueryBuilder('supplier');
    if (branchId) {
      summaryQuery.andWhere(
        '(supplier.branchId = :branchId OR supplier.branchId IS NULL)',
        { branchId },
      );
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

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`المورد برقم ${id} غير موجود`);
    }
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.supplierCode !== undefined) supplier.supplierCode = dto.supplierCode?.trim() || undefined;
    if (dto.phone !== undefined) supplier.phone = dto.phone?.trim() || undefined;
    if (dto.address !== undefined) supplier.address = dto.address?.trim() || undefined;
    if (dto.notes !== undefined) supplier.notes = dto.notes?.trim() || undefined;

    return this.supplierRepo.save(supplier);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const supplier = await this.findOne(id);
    await this.supplierRepo.remove(supplier);
    return { success: true, message: 'تم حذف المورد بنجاح' };
  }

  async recordInvoice(
    supplierId: number,
    dto: SupplierInvoiceDto,
    username?: string,
  ) {
    const supplier = await this.findOne(supplierId);
    const totalAmount = Number(dto.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('يجب أن يكون إجمالي مبلغ الفاتورة أكبر من 0');
    }

    const paidAmount = Math.max(0, Number(dto.paidAmount) || 0);
    const invoiceDate = dto.invoiceDate || new Date().toISOString().split('T')[0];
    const prevDebt = Number(supplier.currentDebt) || 0;

    // 1. Record Charge (Goods Invoice)
    const afterInvoiceDebt = prevDebt + totalAmount;
    const invoiceEntry = new SupplierDebtLedger();
    invoiceEntry.supplierId = supplier.id;
    invoiceEntry.branchId = dto.branchId || supplier.branchId;
    invoiceEntry.transactionType = TransactionType.CHARGE;
    invoiceEntry.invoiceNumber = dto.invoiceNumber?.trim() || undefined;
    invoiceEntry.amount = totalAmount;
    invoiceEntry.paidAmount = paidAmount;
    invoiceEntry.balanceAfter = afterInvoiceDebt;
    invoiceEntry.description = dto.notes?.trim() || `فاتورة توريد بضاعة${dto.invoiceNumber ? ` #${dto.invoiceNumber}` : ''}`;
    invoiceEntry.invoiceDate = invoiceDate;
    invoiceEntry.recordedBy = username || 'المستخدم';

    await this.ledgerRepo.save(invoiceEntry);

    // 2. If immediate payment was made, record payment ledger entry
    let finalDebt = afterInvoiceDebt;
    if (paidAmount > 0) {
      finalDebt = afterInvoiceDebt - paidAmount;
      const paymentEntry = new SupplierDebtLedger();
      paymentEntry.supplierId = supplier.id;
      paymentEntry.branchId = dto.branchId || supplier.branchId;
      paymentEntry.transactionType = TransactionType.PAYMENT;
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

    // 3. Update Supplier Totals
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

  async recordPayment(
    supplierId: number,
    dto: SupplierPaymentDto,
    username?: string,
  ) {
    const supplier = await this.findOne(supplierId);
    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('يجب أن يكون مبلغ الدفعة أكبر من 0');
    }

    const prevDebt = Number(supplier.currentDebt) || 0;
    const finalDebt = prevDebt - amount;
    const paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];

    // Record Payment Entry in Ledger
    const paymentEntry = new SupplierDebtLedger();
    paymentEntry.supplierId = supplier.id;
    paymentEntry.branchId = dto.branchId || supplier.branchId;
    paymentEntry.transactionType = TransactionType.PAYMENT;
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

    // Update Supplier Totals
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

  async getLedger(
    supplierId: number,
    page: number = 1,
    limit: number = 100,
  ) {
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
}
