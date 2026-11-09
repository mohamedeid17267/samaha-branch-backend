import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerPaymentDto } from './dto/payment.dto';
import { CustomerInvoiceDto } from './dto/customer-invoice.dto';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class CustomersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerDebtLedger)
    private ledgerRepository: Repository<CustomerDebtLedger>,
    private dataSource: DataSource,
    private activityService: ActivityService,
  ) {}

  async onApplicationBootstrap() {
    const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
    if (isVercel) return;
    await this.checkAllCustomersLateDebt();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCustomerDebtCheck() {
    await this.checkAllCustomersLateDebt();
  }

  async checkAllCustomersLateDebt() {
    const customers = await this.customerRepository.find({
      where: { currentDebt: MoreThan(0) } as any,
    });
    for (const c of customers) {
      if (Number(c.currentDebt) > 0) {
        await this.checkLateCustomerDebtAndNotify(c);
      }
    }
  }

  async checkLateCustomerDebtAndNotify(customer: Customer) {
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
    } else {
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

  async create(createCustomerDto: CreateCustomerDto, username = 'النظام'): Promise<Customer> {
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
        transactionType: TransactionType.CHARGE,
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

  async findAll(
    branchId?: number,
    search?: string,
    page = 1,
    limit = 50,
  ): Promise<{
    data: Customer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
    summary: {
      totalCustomers: number;
      totalInvoiced: number;
      totalPaid: number;
      totalCurrentDebt: number;
    };
  }> {
    const query = this.customerRepository.createQueryBuilder('customer');

    if (branchId) {
      query.andWhere(
        '(customer.branchId = :branchId OR customer.branchId IS NULL)',
        { branchId },
      );
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query.andWhere(
        '(customer.name LIKE :term OR customer.customerCode LIKE :term OR customer.phone LIKE :term)',
        { term },
      );
    }

    query.orderBy('customer.currentDebt', 'DESC');
    query.addOrderBy('customer.updatedAt', 'DESC');

    const totalCount = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Summary totals for all matching customers
    const summaryQuery = this.customerRepository.createQueryBuilder('customer');
    if (branchId) {
      summaryQuery.andWhere(
        '(customer.branchId = :branchId OR customer.branchId IS NULL)',
        { branchId },
      );
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

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`العميل برقم ${id} غير موجود`);
    }
    return customer;
  }

  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id);
    if (updateCustomerDto.name !== undefined) customer.name = updateCustomerDto.name.trim();
    if (updateCustomerDto.phone !== undefined) customer.phone = updateCustomerDto.phone?.trim() || undefined;
    if (updateCustomerDto.address !== undefined) customer.address = updateCustomerDto.address?.trim() || undefined;
    if ((updateCustomerDto as any).customerCode !== undefined) customer.customerCode = (updateCustomerDto as any).customerCode?.trim() || undefined;
    if ((updateCustomerDto as any).notes !== undefined) customer.notes = (updateCustomerDto as any).notes?.trim() || undefined;

    return this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const customer = await this.findOne(id);
    if (Number(customer.currentDebt) !== 0) {
      throw new BadRequestException(
        'لا يمكن حذف العميل لوجود مديونية قائمة في حسابه',
      );
    }
    await this.customerRepository.remove(customer);
    return { success: true, message: 'تم حذف العميل بنجاح' };
  }

  async recordInvoice(
    customerId: number,
    dto: CustomerInvoiceDto,
    username = 'النظام',
  ) {
    const customer = await this.findOne(customerId);
    const totalAmount = Number(dto.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('يجب أن يكون إجمالي مبلغ الفاتورة أكبر من 0');
    }

    const paidAmount = Math.max(0, Number(dto.paidAmount) || 0);
    const invoiceDate = dto.invoiceDate || new Date().toISOString().split('T')[0];
    const prevDebt = Number(customer.currentDebt) || 0;

    // 1. Record Charge Entry (Customer Goods / Service Purchase)
    const afterInvoiceDebt = prevDebt + totalAmount;
    const invoiceEntry = this.ledgerRepository.create({
      customerId: customer.id,
      branchId: dto.branchId || customer.branchId,
      transactionType: TransactionType.CHARGE,
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

    // 2. If immediate payment was made, record payment ledger entry
    let finalDebt = afterInvoiceDebt;
    if (paidAmount > 0) {
      finalDebt = afterInvoiceDebt - paidAmount;
      const paymentEntry = this.ledgerRepository.create({
        customerId: customer.id,
        branchId: dto.branchId || customer.branchId,
        transactionType: TransactionType.PAYMENT,
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

    // 3. Update Customer Totals
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

  async registerPayment(
    id: number,
    paymentDto: CustomerPaymentDto,
    username = 'النظام',
  ): Promise<CustomerDebtLedger> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!customer) {
        throw new NotFoundException(`العميل برقم ${id} غير موجود`);
      }

      const amount = Number(paymentDto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('يجب أن يكون مبلغ الدفعة أكبر من 0');
      }

      const currentBalance = Number(customer.currentDebt) || 0;
      const newBalance = currentBalance - amount;
      const paymentDate = paymentDto.paymentDate || new Date().toISOString().split('T')[0];

      // Create ledger entry
      const ledgerEntry = queryRunner.manager.create(CustomerDebtLedger, {
        customerId: id,
        branchId: paymentDto.branchId || customer.branchId,
        transactionType: TransactionType.PAYMENT,
        amount: amount,
        paidAmount: amount,
        balanceAfter: newBalance,
        paymentMethod: paymentDto.paymentMethod || 'نقدي',
        description:
          paymentDto.notes?.trim() ||
          paymentDto.description?.trim() ||
          (paymentDto.receiptNumber ? `سند قبض نقدية #${paymentDto.receiptNumber}` : 'سداد دفعة من الحساب'),
        invoiceDate: paymentDate,
        recordedBy: username,
        receiptUrl: paymentDto.receiptUrl,
      });

      await queryRunner.manager.save(ledgerEntry);

      // Update customer balance & totals
      customer.totalPaid = Number(customer.totalPaid || 0) + amount;
      customer.currentDebt = Number(customer.totalInvoiced || 0) - Number(customer.totalPaid);
      await queryRunner.manager.save(customer);

      // Create audit log
      await this.activityService.createAuditLog(
        username,
        'تسجيل مدفوعات عميل',
        `تم استلام مبلغ ${amount} ج.م من العميل ${customer.name}. الرصيد الحالي: ${customer.currentDebt} ج.م`,
      );

      await queryRunner.commitTransaction();
      return ledgerEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStatement(
    id: number,
    page = 1,
    limit = 100,
  ): Promise<{
    customer: Customer;
    history: CustomerDebtLedger[];
    meta: { total: number; page: number; limit: number; totalPages: number };
    summary: {
      totalInvoiced: number;
      totalPaid: number;
      currentDebt: number;
      rawTotalInvoiced?: number;
      rawTotalPaid?: number;
      returnedInvoicedSum?: number;
    };
  }> {
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

    // Automatically exclude fully returned sales from effective invoiced & paid totals
    let fullyReturnedTotal = 0;
    const invoiceGroups: Record<string, { charged: number; returned: number; status?: string }> = {};

    for (const entry of history) {
      let key = entry.relatedSaleId ? `sale_${entry.relatedSaleId}` : null;
      if (!key && entry.invoiceNumber) {
        const clean = String(entry.invoiceNumber).replace(/^RET-/i, '').replace(/^#/, '').replace(/^POS\s*#?/i, '').trim();
        if (clean) key = `inv_${clean}`;
      }
      if (!key && entry.description) {
        const match = String(entry.description).match(/#([A-Za-z0-9_-]+)/);
        if (match && match[1]) {
          const clean = match[1].replace(/^RET-/i, '').replace(/^POS\s*#?/i, '').trim();
          if (clean) key = `inv_${clean}`;
        }
      }
      if (!key) continue;

      if (!invoiceGroups[key]) {
        invoiceGroups[key] = { charged: 0, returned: 0, status: entry.relatedSale?.status };
      }
      const amt = Number(entry.amount) || 0;
      const isReturn =
        (entry.invoiceNumber && String(entry.invoiceNumber).startsWith('RET-')) ||
        (entry.description && String(entry.description).includes('مرتجع'));

      if (entry.transactionType === TransactionType.CHARGE) {
        invoiceGroups[key].charged += amt;
      } else if (isReturn) {
        invoiceGroups[key].returned += amt;
      }
    }

    for (const data of Object.values(invoiceGroups)) {
      if (
        data.status === 'RETURNED' ||
        (data.returned > 0 && data.charged > 0 && data.returned >= data.charged - 0.5)
      ) {
        fullyReturnedTotal += data.charged;
      }
    }

    const rawInvoiced = Number(customer.totalInvoiced) || 0;
    const rawPaid = Number(customer.totalPaid) || 0;
    const cleanInvoiced = Math.max(0, rawInvoiced - fullyReturnedTotal);
    const cleanPaid = Math.max(0, rawPaid - fullyReturnedTotal);

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
        totalInvoiced: cleanInvoiced,
        totalPaid: cleanPaid,
        currentDebt: Number(customer.currentDebt) || 0,
        rawTotalInvoiced: rawInvoiced,
        rawTotalPaid: rawPaid,
        returnedInvoicedSum: fullyReturnedTotal,
      },
    };
  }

  async getLedger(
    id: number,
    page = 1,
    limit = 100,
  ): Promise<any> {
    return this.getStatement(id, page, limit);
  }

  async deleteTransaction(
    customerId: number,
    transactionId: number,
    username = 'النظام',
  ): Promise<{ success: boolean; message: string; customer: Customer }> {
    const customer = await this.findOne(customerId);

    const transaction = await this.ledgerRepository.findOne({
      where: { id: transactionId, customerId: customer.id },
      relations: { relatedSale: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `الحركة برقم ${transactionId} غير موجودة في كشف حساب هذا العميل`,
      );
    }

    const txTypeStr =
      transaction.transactionType === TransactionType.CHARGE
        ? 'فاتورة/مديونية'
        : 'سداد/دفعة';
    const txAmount = transaction.amount;
    const txDesc = transaction.description || '';

    // Remove the ledger entry
    await this.ledgerRepository.remove(transaction);

    // Recalculate customer ledger running balances and totals in chronological order
    const allRecords = await this.ledgerRepository.find({
      where: { customerId: customer.id },
      order: { id: 'ASC' },
    });

    let currentBalance = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;

    for (const record of allRecords) {
      if (record.transactionType === TransactionType.CHARGE) {
        currentBalance += Number(record.amount) || 0;
        totalInvoiced += Number(record.amount) || 0;
      } else if (record.transactionType === TransactionType.PAYMENT) {
        currentBalance -= Number(record.amount) || 0;
        totalPaid += Number(record.amount) || 0;
      }
      record.balanceAfter = currentBalance;
      await this.ledgerRepository.save(record);
    }

    customer.currentDebt = currentBalance;
    customer.totalInvoiced = totalInvoiced;
    customer.totalPaid = totalPaid;
    const savedCustomer = await this.customerRepository.save(customer);

    // Audit log
    await this.activityService.createAuditLog(
      username,
      'حذف حركة من كشف حساب العميل',
      `تم حذف حركة (${txTypeStr}) بقيمة ${txAmount} ج.م للعميل ${customer.name}. الرصيد الجديد: ${customer.currentDebt} ج.م (${txDesc})`,
    );

    return {
      success: true,
      message: 'تم حذف الحركة وإعادة احتساب رصيد العميل بنجاح',
      customer: savedCustomer,
    };
  }

  async deleteTransactionById(
    transactionId: number,
    username = 'النظام',
  ): Promise<{ success: boolean; message: string; customer: Customer }> {
    const transaction = await this.ledgerRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`الحركة برقم ${transactionId} غير موجودة`);
    }

    return this.deleteTransaction(transaction.customerId, transactionId, username);
  }
}
