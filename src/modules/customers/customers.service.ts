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

  async getLedger(
    id: number,
    page = 1,
    limit = 100,
  ): Promise<any> {
    return this.getStatement(id, page, limit);
  }
}
