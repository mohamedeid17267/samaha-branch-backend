import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { BranchSaleItem } from '../../database/entities/branch-sale-item.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { Product } from '../../database/entities/product.entity';
import { StockMovement, StockMovementType } from '../../database/entities/stock-movement.entity';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { SupplierDebtLedger } from '../../database/entities/supplier-debt-ledger.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ActivityService } from '../activity/activity.service';
import { MemoryCacheService } from '../../common/services/cache.service';
import { WebsiteSyncService } from '../../common/services/website-sync.service';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    @InjectRepository(BranchSale)
    private saleRepository: Repository<BranchSale>,
    private dataSource: DataSource,
    private activityService: ActivityService,
    private cacheService: MemoryCacheService,
    private websiteSyncService: WebsiteSyncService,
  ) {}

  async createSale(
    createSaleDto: CreateSaleDto,
    username = 'System',
  ): Promise<BranchSale> {
    const {
      branchId,
      items,
      discount = 0,
      paymentMethod = 'CASH',
      saleType = 'RETAIL',
      customerName,
      customerId,
      paidAmount,
      remainingAmount,
    } = createSaleDto;

    const effectiveIdempotencyKey = createSaleDto.idempotencyKey || createSaleDto.uuid;
    if (effectiveIdempotencyKey) {
      const existingSale = await this.saleRepository.findOne({
        where: { idempotencyKey: effectiveIdempotencyKey },
        relations: { items: { product: true }, branch: true, customer: true },
      });
      if (existingSale) {
        this.logger.log(
          `[Idempotency Hit] Sale already processed for key: ${effectiveIdempotencyKey} (Sale ID: ${existingSale.id})`,
        );
        return existingSale;
      }
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    const pendingMovements: {
      productId: number;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
    }[] = [];

    const completedSale = await this.dataSource.transaction(async (manager) => {
      // 1. Bulk fetch all needed inventories in ONE query
      const productIds = Array.from(new Set(items.map((i) => Number(i.productId))));
      const inventories = await manager.find(BranchInventory, {
        where: { branchId, productId: In(productIds) },
        relations: { product: true },
      });

      const invMap = new Map<number, BranchInventory>();
      for (const inv of inventories) {
        invMap.set(Number(inv.productId), inv);
      }

      let totalAmount = 0;
      const saleItems: BranchSaleItem[] = [];
      const invUpdatesMap = new Map<number, { id: number; newQty: number }>();

      for (const itemDto of items) {
        const pId = Number(itemDto.productId);
        const inventory = invMap.get(pId);
        if (!inventory) {
          throw new NotFoundException(
            `Product ID ${pId} not found in branch inventory`,
          );
        }

        const isManual =
          pId === 1500027 ||
          inventory.product?.category === 'خدمات' ||
          inventory.product?.category === 'صنف يدوي' ||
          inventory.product?.sku === 'MANUAL-POS-ITEM';

        if (!isManual) {
          const invId = inventory.id;
          const currentQtyInMap = invUpdatesMap.has(invId)
            ? invUpdatesMap.get(invId)!.newQty
            : Number(inventory.currentQuantity || 0);

          if (currentQtyInMap < itemDto.quantity) {
            throw new BadRequestException(
              `رصيد الصنف [${inventory.product?.name || pId}] غير كافٍ بالمخزن (المتاح: ${currentQtyInMap} قطعة، المطلوب: ${itemDto.quantity} قطعة)`,
            );
          }

          const newQty = currentQtyInMap - itemDto.quantity;
          inventory.currentQuantity = newQty;
          invUpdatesMap.set(invId, { id: invId, newQty });

          pendingMovements.push({
            productId: pId,
            quantity: itemDto.quantity,
            balanceBefore: currentQtyInMap,
            balanceAfter: newQty,
          });
        }

        // Determine price based on selected saleType: RETAIL, WHOLESALE, or WEBSITE
        let unitPrice = 0;
        const effectiveSaleType = (saleType || 'RETAIL').toUpperCase();

        if (effectiveSaleType === 'WHOLESALE') {
          unitPrice =
            Number(inventory.wholesalePrice) ||
            Number(inventory.product?.wholesalePrice) ||
            Number(inventory.sellingPrice) ||
            0;
        } else if (effectiveSaleType === 'WEBSITE') {
          unitPrice =
            Number(inventory.websitePrice) ||
            Number(inventory.product?.websitePrice) ||
            Number(inventory.sellingPrice) ||
            0;
        } else {
          // Default RETAIL
          unitPrice =
            Number(inventory.retailPrice) ||
            Number(inventory.product?.retailPrice) ||
            Number(inventory.sellingPrice) ||
            0;
        }

        if (itemDto.unitPrice !== undefined && itemDto.unitPrice !== null && Number(itemDto.unitPrice) >= 0) {
          unitPrice = Number(itemDto.unitPrice);
        }

        const subTotal = unitPrice * itemDto.quantity;
        totalAmount += subTotal;

        const saleItem = manager.create(BranchSaleItem, {
          productId: pId,
          quantity: itemDto.quantity,
          unitPrice,
          subTotal,
        });
        (saleItem as any).product = inventory.product;
        saleItems.push(saleItem);
      }

      // 2. High-speed bulk update for all branch inventories in ONE query
      if (invUpdatesMap.size > 0) {
        const updates = Array.from(invUpdatesMap.values());
        const ids = updates.map((u) => u.id).join(',');
        const cases = updates
          .map((u) => `WHEN ${u.id} THEN ${u.newQty}`)
          .join(' ');
        await manager.query(
          `UPDATE branch_inventories SET currentQuantity = CASE id ${cases} END WHERE id IN (${ids})`,
        );
      }

      const netAmount = Math.max(0, totalAmount - Number(discount || 0));

      // Determine paid and remaining amounts based on payment method and customer
      let salePaid = netAmount;
      let saleRemaining = 0;

      if (paymentMethod === 'CREDIT' || paymentMethod === 'آجل') {
        salePaid = 0;
        saleRemaining = netAmount;
      } else if (remainingAmount !== undefined && Number(remainingAmount) > 0) {
        saleRemaining = Number(remainingAmount);
        salePaid = paidAmount !== undefined ? Number(paidAmount) : Math.max(0, netAmount - saleRemaining);
      } else if (paidAmount !== undefined && Number(paidAmount) < netAmount) {
        salePaid = Math.max(0, Number(paidAmount));
        saleRemaining = Math.max(0, netAmount - salePaid);
      }

      let finalCustomerName = customerName;

      // If customer is linked, verify & fetch customer
      let customer: Customer | null = null;
      if (customerId) {
        customer = await manager.findOne(Customer, {
          where: { id: customerId },
        });
        if (customer && !finalCustomerName) {
          finalCustomerName = customer.name;
        }
      }

      // Determine effective sale creation timestamp (especially for offline-first synced sales)
      const explicitCreatedAt = createSaleDto.createdAt
        ? new Date(createSaleDto.createdAt)
        : null;
      const validCreatedAt =
        explicitCreatedAt && !isNaN(explicitCreatedAt.getTime())
          ? explicitCreatedAt
          : null;

      const sale = manager.create(BranchSale, {
        branchId,
        totalAmount,
        discount,
        netAmount,
        paymentMethod,
        saleType: saleType || 'RETAIL',
        customerName: finalCustomerName,
        customerId: customer?.id || customerId || undefined,
        paidAmount: salePaid,
        remainingAmount: saleRemaining,
        idempotencyKey: effectiveIdempotencyKey || undefined,
        offlineReferenceId: createSaleDto.uuid || undefined,
        invoiceNumber: createSaleDto.invoiceNumber || undefined,
        deviceId: createSaleDto.deviceId || undefined,
        syncedAt: effectiveIdempotencyKey ? new Date() : undefined,
        createdAt: validCreatedAt || undefined,
      });

      const savedSale = await manager.save(sale);

      // 3. Ultra-fast bulk insert of BranchSaleItems in ONE query (bypasses slow N-query loop)
      const saleItemValues = saleItems.map((item) => ({
        saleId: savedSale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.subTotal,
      }));

      if (saleItemValues.length > 0) {
        for (let i = 0; i < saleItemValues.length; i += 250) {
          const chunk = saleItemValues.slice(i, i + 250);
          await manager
            .createQueryBuilder()
            .insert()
            .into(BranchSaleItem)
            .values(chunk)
            .execute();
        }
      }

      // Force update createdAt if this was an offline sale synced at a later time
      if (validCreatedAt) {
        await manager.update(
          BranchSale,
          { id: savedSale.id },
          { createdAt: validCreatedAt },
        );
        savedSale.createdAt = validCreatedAt;
      }

      // If customer exists, record debt ledger and update customer balance
      if (customer) {
        const prevDebt = Number(customer.currentDebt) || 0;
        const afterInvoiceDebt = prevDebt + netAmount;
        const finalDebt = afterInvoiceDebt - salePaid;

        const effectiveInvoiceDate = validCreatedAt
          ? validCreatedAt.toISOString().split('T')[0]
          : (createSaleDto.createdAt
            ? new Date(createSaleDto.createdAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]);

        // 1. Charge Entry in Customer Ledger
        const chargeEntry = manager.create(CustomerDebtLedger, {
          customerId: customer.id,
          branchId,
          transactionType: TransactionType.CHARGE,
          invoiceNumber: createSaleDto.invoiceNumber || String(savedSale.id),
          relatedSaleId: savedSale.id,
          amount: netAmount,
          paidAmount: salePaid,
          balanceAfter: afterInvoiceDebt,
          description: `فاتورة مبيعات POS #${createSaleDto.invoiceNumber || savedSale.id}`,
          invoiceDate: effectiveInvoiceDate,
          paymentMethod,
          recordedBy: username,
          createdAt: validCreatedAt || undefined,
        });
        const savedCharge = await manager.save(chargeEntry);
        if (validCreatedAt) {
          await manager.update(
            CustomerDebtLedger,
            { id: savedCharge.id },
            { createdAt: validCreatedAt },
          );
        }

        // 2. Immediate Payment Entry (if customer paid cash/card part or full)
        if (salePaid > 0) {
          const paymentEntry = manager.create(CustomerDebtLedger, {
            customerId: customer.id,
            branchId,
            transactionType: TransactionType.PAYMENT,
            invoiceNumber: createSaleDto.invoiceNumber || String(savedSale.id),
            relatedSaleId: savedSale.id,
            amount: salePaid,
            paidAmount: salePaid,
            balanceAfter: finalDebt,
            description: `سداد مع فاتورة POS #${createSaleDto.invoiceNumber || savedSale.id}`,
            invoiceDate: effectiveInvoiceDate,
            paymentMethod: paymentMethod === 'CREDIT' ? 'نقدي' : paymentMethod,
            recordedBy: username,
            createdAt: validCreatedAt || undefined,
          });
          const savedPayment = await manager.save(paymentEntry);
          if (validCreatedAt) {
            await manager.update(
              CustomerDebtLedger,
              { id: savedPayment.id },
              { createdAt: validCreatedAt },
            );
          }
        }

        // 3. Update Customer Cumulative Totals
        customer.totalInvoiced = Number(customer.totalInvoiced || 0) + netAmount;
        customer.totalPaid = Number(customer.totalPaid || 0) + salePaid;
        customer.currentDebt = Number(customer.totalInvoiced) - Number(customer.totalPaid);
        await manager.save(customer);
      }

      // 4. Ultra-fast bulk insert of StockMovements in ONE query (bypasses slow N-query loop)
      if (pendingMovements.length > 0) {
        const movementValues = pendingMovements.map((pm) => ({
          productId: pm.productId,
          branchId,
          type: StockMovementType.OUT_SALE,
          quantity: -pm.quantity,
          balanceBefore: pm.balanceBefore,
          balanceAfter: pm.balanceAfter,
          referenceType: 'POS_SALE',
          referenceId: String(savedSale.id),
          notes: `فاتورة بيع كاشير POS رقم #${savedSale.id}`,
          performedBy: username,
          createdAt: validCreatedAt || new Date(),
        }));

        for (let i = 0; i < movementValues.length; i += 250) {
          const chunk = movementValues.slice(i, i + 250);
          await manager
            .createQueryBuilder()
            .insert()
            .into(StockMovement)
            .values(chunk)
            .execute();
        }
      }

      savedSale.items = saleItems;
      savedSale.customer = customer || undefined;
      return savedSale;
    });

    // Invalidate inventory cache
    this.cacheService.invalidatePattern(`inventory:${branchId}`);

    // Asynchronous audit logging outside the transaction
    this.activityService.createAuditLog(
      username,
      'عملية بيع POS',
      `تسجيل مبيعات للفرع بقيمة ${completedSale.netAmount} ج.م (رقم الفاتورة #${completedSale.id})${
        completedSale.customerName ? ` لصالح العميل: ${completedSale.customerName}` : ''
      }`,
    ).catch((err) => this.logger.warn(`Audit log error: ${err.message}`));

    // Background sync to Linea website (100% non-blocking via setImmediate to return HTTP response in milliseconds)
    if (completedSale && Array.isArray(completedSale.items)) {
      const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
      const lineaUrl = process.env.LINEA_WEBSITE_URL;
      const skipWebsiteSync = isVercel && (!lineaUrl || lineaUrl.includes('localhost') || lineaUrl.includes('127.0.0.1'));

      if (!skipWebsiteSync) {
        setImmediate(async () => {
          try {
            const syncService = this.websiteSyncService || new WebsiteSyncService();
            const processedProductIds = new Set<number>();

            for (const item of completedSale.items) {
              if (!item.productId || processedProductIds.has(item.productId)) continue;
              processedProductIds.add(item.productId);

              const pm = [...pendingMovements].reverse().find((m) => m.productId === item.productId);
              const newStock = pm ? pm.balanceAfter : 0;
              const sku = item.product?.sku;
              const websitePrice = Number(item.product?.websitePrice || item.product?.retailPrice || 0);
              const wholesalePrice = Number(item.product?.wholesalePrice || 0);

              if (sku) {
                syncService.syncStock(sku, newStock, { price: websitePrice, wholesalePrice }).catch(() => {});
              }
            }
          } catch (syncErr: any) {
            this.logger.warn(`Background website sync error: ${syncErr.message}`);
          }
        });
      }
    }

    return completedSale;
  }


  async getSales(
    branchId?: number,
    page = 1,
    limit = 200,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    data: BranchSale[];
    total: number;
    page: number;
    limit: number;
    summary: {
      totalSales: number;
      totalReturns?: number;
      invoicesCount: number;
      totalItemsCount: number;
      cashTotal: number;
      visaTotal: number;
      instapayTotal: number;
      walletTotal: number;
      creditTotal: number;
    };
  }> {
    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.branch', 'branch')
      .leftJoinAndSelect('sale.customer', 'customer');

    if (branchId && Number(branchId) > 0) {
      qb.where('sale.branchId = :branchId', { branchId: Number(branchId) });
    }

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere('sale.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    qb.orderBy('sale.createdAt', 'DESC');

    const allMatching = await qb.getMany();
    const total = allMatching.length;

    let totalSales = 0;
    let totalReturns = 0;
    let totalItemsCount = 0;
    let cashTotal = 0;
    let visaTotal = 0;
    let instapayTotal = 0;
    let walletTotal = 0;
    let creditTotal = 0;

    for (const s of allMatching) {
      const net = Number(s.netAmount) || 0;
      const retAmt = Number((s as any).returnedAmount || 0) || (s.status === 'RETURNED' ? net : 0);
      totalReturns += retAmt;

      const effectiveNet = Math.max(0, net - retAmt);
      totalSales += effectiveNet;

      const rawPaid = Number(
        s.paidAmount !== undefined && s.paidAmount !== null
          ? s.paidAmount
          : s.paymentMethod === 'CREDIT' || s.paymentMethod === 'آجل'
          ? 0
          : net,
      );
      const rawRemaining = Number(
        s.remainingAmount !== undefined && s.remainingAmount !== null
          ? s.remainingAmount
          : s.paymentMethod === 'CREDIT' || s.paymentMethod === 'آجل'
          ? net
          : Math.max(0, net - rawPaid),
      );

      let effectiveRemaining = rawRemaining;
      let effectivePaid = rawPaid;
      if (retAmt > 0) {
        if (effectiveRemaining >= retAmt) {
          effectiveRemaining -= retAmt;
        } else {
          const excess = retAmt - effectiveRemaining;
          effectiveRemaining = 0;
          effectivePaid = Math.max(0, effectivePaid - excess);
        }
      }

      creditTotal += effectiveRemaining;

      if (effectivePaid > 0) {
        const m = (s.paymentMethod || 'CASH').toUpperCase();
        if (m === 'CASH' || m === 'كاش') {
          cashTotal += effectivePaid;
        } else if (m === 'CARD' || m === 'VISA') {
          visaTotal += effectivePaid;
        } else if (m === 'INSTAPAY') {
          instapayTotal += effectivePaid;
        } else if (m === 'WALLET') {
          walletTotal += effectivePaid;
        } else if (m !== 'CREDIT' && m !== 'آجل') {
          cashTotal += effectivePaid;
        }
      }
      if (s.items && Array.isArray(s.items)) {
        for (const item of s.items) {
          totalItemsCount += Number(item.quantity) || 0;
        }
      }
    }

    const data =
      limit && limit > 0
        ? allMatching.slice((page - 1) * limit, page * limit)
        : allMatching;

    return {
      data,
      total,
      page,
      limit,
      summary: {
        totalSales,
        totalReturns,
        invoicesCount: total,
        totalItemsCount,
        cashTotal,
        visaTotal,
        instapayTotal,
        walletTotal,
        creditTotal,
      },
    };
  }

  async getTreasuryReport(
    branchId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.customer', 'customer')
      .where('sale.branchId = :branchId', { branchId });

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere('sale.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    qb.orderBy('sale.createdAt', 'DESC');
    const sales = await qb.getMany();

    // Query customer debt payments during this date range if any
    const debtQb = this.dataSource
      .getRepository(CustomerDebtLedger)
      .createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.customer', 'customer')
      .where('ledger.branchId = :branchId', { branchId })
      .andWhere('ledger.transactionType = :txType', { txType: TransactionType.PAYMENT });

    if (startDate) {
      debtQb.andWhere('ledger.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      debtQb.andWhere('ledger.createdAt <= :endDate', { endDate: new Date(endDate) });
    }
    debtQb.orderBy('ledger.createdAt', 'DESC');
    const debtPayments = await debtQb.getMany();

    let cash = 0;
    let instapay = 0;
    let wallet = 0;
    let card = 0;
    let credit = 0;
    let totalSales = 0;

    let cashCount = 0;
    let instapayCount = 0;
    let walletCount = 0;
    let cardCount = 0;
    let creditCount = 0;

    for (const s of sales) {
      const net = Number(s.netAmount) || 0;
      totalSales += net;

      const paid = Number(
        s.paidAmount !== undefined && s.paidAmount !== null
          ? s.paidAmount
          : s.paymentMethod === 'CREDIT'
          ? 0
          : net,
      );
      const remaining = Number(
        s.remainingAmount !== undefined && s.remainingAmount !== null
          ? s.remainingAmount
          : s.paymentMethod === 'CREDIT'
          ? net
          : 0,
      );

      const m = (s.paymentMethod || 'CASH').toUpperCase();
      if (m === 'CASH' || m === 'كاش') {
        cash += paid;
        cashCount++;
      } else if (m === 'INSTAPAY') {
        instapay += paid;
        instapayCount++;
      } else if (m === 'WALLET') {
        wallet += paid;
        walletCount++;
      } else if (m === 'CARD' || m === 'VISA') {
        card += paid;
        cardCount++;
      } else if (m === 'CREDIT' || m === 'آجل') {
        creditCount++;
      } else {
        cash += paid;
        cashCount++;
      }

      if (remaining > 0) {
        credit += remaining;
      }
    }

    // Include external customer debt ledger payments
    const externalDebtPayments = debtPayments.filter((p) => !p.relatedSaleId);
    for (const p of externalDebtPayments) {
      const amt = Number(p.amount) || Number(p.paidAmount) || 0;
      const method = (p.paymentMethod || 'CASH').toUpperCase();
      if (method.includes('INSTAPAY') || method.includes('انستا')) {
        instapay += amt;
        instapayCount++;
      } else if (method.includes('WALLET') || method.includes('محفظ') || method.includes('فودافون')) {
        wallet += amt;
        walletCount++;
      } else if (method.includes('CARD') || method.includes('VISA') || method.includes('فيزا')) {
        card += amt;
        cardCount++;
      } else {
        cash += amt;
        cashCount++;
      }
    }

    // Query branch expenses during this date range (Treasury Outflows)
    const expenseQb = this.dataSource
      .getRepository(BranchExpense)
      .createQueryBuilder('expense')
      .where('expense.branchId = :branchId', { branchId });

    if (startDate) {
      expenseQb.andWhere('(expense.createdAt >= :startDate OR expense.expenseDate >= :startDay)', {
        startDate: new Date(startDate),
        startDay: startDate.split('T')[0],
      });
    }
    if (endDate) {
      expenseQb.andWhere('(expense.createdAt <= :endDate OR expense.expenseDate <= :endDay)', {
        endDate: new Date(endDate),
        endDay: endDate.split('T')[0],
      });
    }
    expenseQb.orderBy('expense.createdAt', 'DESC');
    const expenses = await expenseQb.getMany().catch(() => []);

    // Query supplier debt payments during this date range (Treasury Outflows)
    const supplierPayQb = this.dataSource
      .getRepository(SupplierDebtLedger)
      .createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.supplier', 'supplier')
      .where('(ledger.branchId = :branchId OR ledger.branchId IS NULL)', { branchId })
      .andWhere('ledger.transactionType = :txType', { txType: TransactionType.PAYMENT });

    if (startDate) {
      supplierPayQb.andWhere('ledger.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      supplierPayQb.andWhere('ledger.createdAt <= :endDate', { endDate: new Date(endDate) });
    }
    supplierPayQb.orderBy('ledger.createdAt', 'DESC');
    const supplierPayments = await supplierPayQb.getMany().catch(() => []);

    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += Number(exp.amount || 0);
    }

    let totalSupplierPayments = 0;
    for (const sp of supplierPayments) {
      totalSupplierPayments += Number(sp.amount || sp.paidAmount || 0);
    }

    const totalOutflows = totalExpenses + totalSupplierPayments;
    const totalCollected = cash + instapay + wallet + card;
    const netTreasuryCash = cash - totalOutflows;
    const netTreasuryTotal = totalCollected - totalOutflows;

    return {
      totals: {
        cash,
        instapay,
        wallet,
        card,
        credit,
        totalCollected,
        totalSales,
        totalExpenses,
        totalSupplierPayments,
        totalOutflows,
        netTreasuryCash,
        netTreasuryTotal,
        invoicesCount: sales.length,
        expensesCount: expenses.length,
        supplierPaymentsCount: supplierPayments.length,
      },
      counts: {
        cash: cashCount,
        instapay: instapayCount,
        wallet: walletCount,
        card: cardCount,
        credit: creditCount,
        expenses: expenses.length,
        supplierPayments: supplierPayments.length,
      },
      sales,
      debtPayments: externalDebtPayments,
      expenses,
      supplierPayments,
    };
  }

  async syncBatch(
    batchData: {
      branchId?: number;
      branchCode?: string;
      deviceId?: string;
      operations: Array<{
        operationId: string;
        idempotencyKey: string;
        entityType: string;
        operationType: string;
        entityId: string;
        payload: any;
        createdAt?: string;
      }>;
    },
    username = 'OfflineSync',
  ) {
    const results: Array<{ operationId: string; status: string; remoteId?: number; error?: string }> = [];

    for (const op of batchData.operations) {
      try {
        if (op.entityType === 'SALE') {
          const saleDto: CreateSaleDto = {
            ...op.payload,
            idempotencyKey: op.idempotencyKey || op.operationId,
            uuid: op.entityId,
            deviceId: batchData.deviceId,
            createdAt: op.createdAt || op.payload?.createdAt,
          };
          const sale = await this.createSale(saleDto, username);
          results.push({ operationId: op.operationId, status: 'ACCEPTED', remoteId: sale.id });
        } else if (op.entityType === 'SALE_RETURN') {
          await this.processSaleReturn(op.payload, username);
          results.push({ operationId: op.operationId, status: 'ACCEPTED' });
        } else {
          results.push({ operationId: op.operationId, status: 'IGNORED' });
        }
      } catch (err: any) {
        this.logger.error(`[syncBatch] Error processing op ${op.operationId}: ${err.message}`);
        results.push({ operationId: op.operationId, status: 'REJECTED', error: err.message });
      }
    }

    return {
      success: true,
      processedCount: results.filter((r) => r.status === 'ACCEPTED').length,
      acknowledgments: results,
    };
  }

  async processSaleReturn(
    returnDto: any,
    username = 'System',
  ) {
    const {
      originalSaleId,
      originalInvoiceNumber,
      branchId = 1,
      items,
      refundAmount = 0,
      refundMethod = 'CASH',
      reason = 'مرتجع مبيعات',
      performedBy,
    } = returnDto;

    const opUser = performedBy || username;

    return this.dataSource.transaction(async (manager) => {
      let originalSale: BranchSale | null = null;
      if (originalSaleId) {
        originalSale = await manager.findOne(BranchSale, {
          where: { id: Number(originalSaleId) },
          relations: { items: true, customer: true },
        });
        if (!originalSale && originalInvoiceNumber) {
          originalSale = await manager.findOne(BranchSale, {
            where: { invoiceNumber: originalInvoiceNumber },
            relations: { items: true, customer: true },
          });
        }
      } else if (originalInvoiceNumber) {
        originalSale = await manager.findOne(BranchSale, {
          where: { invoiceNumber: originalInvoiceNumber },
          relations: { items: true, customer: true },
        });
      }

      // Restore stock for returned items
      const pendingMovements: any[] = [];
      if (Array.isArray(items) && items.length > 0) {
        const productIds = Array.from(new Set(items.map((it) => Number(it.productId)).filter((id) => !isNaN(id) && id > 0)));
        const inventories = await manager.find(BranchInventory, {
          where: { branchId, productId: In(productIds) },
        });
        const invMap = new Map<number, BranchInventory>();
        for (const inv of inventories) {
          invMap.set(Number(inv.productId), inv);
        }

        const invUpdates: Array<{ id: number; newQty: number }> = [];

        for (const it of items) {
          const pId = Number(it.productId);
          const qty = Number(it.quantity) || 0;
          if (qty <= 0) continue;

          const inv = invMap.get(pId);
          if (inv) {
            const prevQty = Number(inv.currentQuantity || 0);
            const newQty = prevQty + qty;
            inv.currentQuantity = newQty;
            invUpdates.push({ id: inv.id, newQty });

            const movement = manager.create(StockMovement, {
              productId: pId,
              branchId,
              type: StockMovementType.RETURN,
              quantity: qty,
              balanceBefore: prevQty,
              balanceAfter: newQty,
              referenceType: 'POS_RETURN',
              referenceId: String(originalSale?.id || originalInvoiceNumber || 'RETURN'),
              notes: `مرتجع مبيعات: ${reason}`,
              performedBy: opUser,
            });
            pendingMovements.push(movement);
          }
        }

        if (invUpdates.length > 0) {
          const ids = invUpdates.map((u) => u.id).join(',');
          const cases = invUpdates
            .map((u) => `WHEN ${u.id} THEN ${u.newQty}`)
            .join(' ');
          await manager.query(
            `UPDATE branch_inventories SET currentQuantity = CASE id ${cases} END WHERE id IN (${ids})`
          );
        }
      }

      if (pendingMovements.length > 0) {
        await manager.save(StockMovement, pendingMovements);
      }

      // If customer exists and refund was credited
      const customer = originalSale?.customer || (originalSale?.customerId ? await manager.findOne(Customer, { where: { id: originalSale.customerId } }) : null);
      if (customer && Number(refundAmount) > 0) {
        const refVal = Number(refundAmount);
        const prevDebt = Number(customer.currentDebt || 0);
        const newDebt = Math.max(0, prevDebt - refVal);
        customer.currentDebt = newDebt;
        customer.totalInvoiced = Math.max(0, Number(customer.totalInvoiced || 0) - refVal);
        await manager.save(customer);

        const ledgerEntry = manager.create(CustomerDebtLedger, {
          customerId: customer.id,
          branchId,
          transactionType: TransactionType.PAYMENT,
          invoiceNumber: `RET-${originalSale?.invoiceNumber || originalSale?.id || Date.now()}`,
          relatedSaleId: originalSale?.id,
          amount: refVal,
          paidAmount: refVal,
          balanceAfter: newDebt,
          description: `مرتجع مبيعات فاتورة #${originalSale?.invoiceNumber || originalSale?.id || ''} (${reason})`,
          invoiceDate: new Date().toISOString().split('T')[0],
          paymentMethod: refundMethod === 'CREDIT' || refundMethod === 'حساب العميل' ? 'خصم مديونية' : refundMethod,
          recordedBy: opUser,
        });
        await manager.save(ledgerEntry);
      }

      // Update original sale status and returnedAmount
      if (originalSale) {
        const currentReturned = Number(originalSale.returnedAmount || 0);
        const refAmt = Number(refundAmount || 0);
        const newReturned = currentReturned + refAmt;
        originalSale.returnedAmount = newReturned;
        const netAmt = Number(originalSale.netAmount || 0);
        originalSale.status = newReturned >= netAmt ? 'RETURNED' : 'PARTIALLY_RETURNED';
        await manager.save(originalSale);
      }

      this.cacheService.invalidatePattern(`inventory:${branchId}`);

      return {
        success: true,
        message: 'تم إرجاع الأصناف بنجاح واستعادة رصيد المخزون',
        refundAmount,
        originalSaleId: originalSale?.id,
      };
    });
  }

  async updateSale(idOrInvoice: string | number, updateDto: any, username: string) {
    return this.dataSource.transaction(async (manager) => {
      let sale: BranchSale | null = null;
      if (!isNaN(Number(idOrInvoice)) && Number(idOrInvoice) > 0) {
        sale = await manager.findOne(BranchSale, {
          where: { id: Number(idOrInvoice) },
          relations: { items: { product: true }, branch: true, customer: true },
        });
      }
      if (!sale) {
        sale = await manager.findOne(BranchSale, {
          where: [
            { invoiceNumber: String(idOrInvoice) },
            { offlineReferenceId: String(idOrInvoice) },
            { idempotencyKey: String(idOrInvoice) },
          ],
          relations: { items: { product: true }, branch: true, customer: true },
        });
      }

      if (!sale) {
        throw new NotFoundException(`الفاتورة [${idOrInvoice}] غير موجودة`);
      }

      const branchId = sale.branchId;

      // 1. Reconcile items and inventory if items are provided
      if (Array.isArray(updateDto.items) && updateDto.items.length > 0) {
        // Restore stock of previous items
        for (const oldItem of sale.items || []) {
          const pId = Number(oldItem.productId);
          const isManual = pId === 1500027 || oldItem.product?.category === 'خدمات' || oldItem.product?.sku === 'MANUAL-POS-ITEM';
          if (!isManual) {
            await manager.query(
              `UPDATE branch_inventories SET currentQuantity = currentQuantity + ? WHERE branchId = ? AND productId = ?`,
              [oldItem.quantity, branchId, pId],
            );
          }
        }

        // Deduct stock of new items
        const newSaleItems: BranchSaleItem[] = [];
        let calculatedTotal = 0;

        for (const itemDto of updateDto.items) {
          const pId = Number(itemDto.productId);
          const isManual = pId === 1500027 || itemDto.isManual || (itemDto.sku && String(itemDto.sku).startsWith('MAN-'));
          const qty = Math.max(1, Math.round(Number(itemDto.quantity) || 1));
          const unitPrice = Number(itemDto.unitPrice || 0);
          const subTotal = qty * unitPrice;
          calculatedTotal += subTotal;

          if (!isManual) {
            await manager.query(
              `UPDATE branch_inventories SET currentQuantity = currentQuantity - ? WHERE branchId = ? AND productId = ?`,
              [qty, branchId, pId],
            );
          }

          const saleItem = manager.create(BranchSaleItem, {
            saleId: sale.id,
            productId: isManual ? 1500027 : pId,
            quantity: qty,
            unitPrice,
            subTotal,
          });
          newSaleItems.push(saleItem);
        }

        // Delete old items and save new items
        await manager.delete(BranchSaleItem, { saleId: sale.id });
        await manager.save(BranchSaleItem, newSaleItems);
        sale.items = newSaleItems;
        sale.totalAmount = calculatedTotal;
      }

      const previousNetAmount = Number(sale.netAmount || 0);
      const previousCustomerId = sale.customerId;

      // 2. Discount & Net Amount
      if (updateDto.discount !== undefined) {
        sale.discount = Math.max(0, Number(updateDto.discount) || 0);
      }
      sale.netAmount = Math.max(0, Number(sale.totalAmount || 0) - Number(sale.discount || 0));

      const netDelta = sale.netAmount - previousNetAmount;

      // 3. Customer
      if (updateDto.customerName !== undefined) {
        sale.customerName = updateDto.customerName;
      }
      if (updateDto.customerId !== undefined) {
        sale.customerId = updateDto.customerId ? Number(updateDto.customerId) : undefined;
      }

      // Reconcile Customer Debt safely (never duplicates charges on already paid invoices!)
      if (sale.customerId && Number(sale.customerId) > 0) {
        const customer = await manager.findOne(Customer, { where: { id: sale.customerId } });
        if (customer) {
          if (previousCustomerId === sale.customerId) {
            // Same customer: only adjust the delta difference
            if (netDelta !== 0) {
              const existingCharge = await manager.findOne(CustomerDebtLedger, {
                where: {
                  customerId: customer.id,
                  relatedSaleId: sale.id,
                  transactionType: TransactionType.CHARGE,
                },
              });
              if (existingCharge) {
                existingCharge.amount = sale.netAmount;
                await manager.save(CustomerDebtLedger, existingCharge);
              }
              customer.totalInvoiced = Math.max(0, Number(customer.totalInvoiced || 0) + netDelta);
              customer.currentDebt = Math.max(0, Number(customer.currentDebt || 0) + netDelta);
              await manager.save(Customer, customer);
            }
          } else {
            // Customer changed
            if (previousCustomerId) {
              const prevCust = await manager.findOne(Customer, { where: { id: previousCustomerId } });
              if (prevCust) {
                await manager.delete(CustomerDebtLedger, { relatedSaleId: sale.id });
                prevCust.totalInvoiced = Math.max(0, Number(prevCust.totalInvoiced || 0) - previousNetAmount);
                prevCust.currentDebt = Math.max(0, Number(prevCust.currentDebt || 0) - previousNetAmount);
                await manager.save(Customer, prevCust);
              }
            }
            const newCharge = manager.create(CustomerDebtLedger, {
              customerId: customer.id,
              branchId,
              transactionType: TransactionType.CHARGE,
              invoiceNumber: sale.invoiceNumber || String(sale.id),
              relatedSaleId: sale.id,
              amount: sale.netAmount,
              paidAmount: 0,
              balanceAfter: Number(customer.currentDebt || 0) + sale.netAmount,
              description: `فاتورة مبيعات معدلة POS #${sale.invoiceNumber || sale.id}`,
              invoiceDate: new Date().toISOString().split('T')[0],
              paymentMethod: sale.paymentMethod,
              recordedBy: username,
            });
            await manager.save(CustomerDebtLedger, newCharge);
            customer.totalInvoiced = Number(customer.totalInvoiced || 0) + sale.netAmount;
            customer.currentDebt = Number(customer.currentDebt || 0) + sale.netAmount;
            await manager.save(Customer, customer);
          }
        }
      }

      // 4. Payment Method & Amounts
      if (updateDto.paymentMethod) {
        sale.paymentMethod = updateDto.paymentMethod;
      }
      if (updateDto.saleType) {
        sale.saleType = updateDto.saleType;
      }

      if (sale.paymentMethod === 'CREDIT' || sale.paymentMethod === 'آجل') {
        sale.paidAmount = updateDto.paidAmount !== undefined ? Number(updateDto.paidAmount) : 0;
        sale.remainingAmount = Math.max(0, sale.netAmount - sale.paidAmount);
      } else {
        sale.paidAmount = updateDto.paidAmount !== undefined ? Number(updateDto.paidAmount) : sale.netAmount;
        sale.remainingAmount = updateDto.remainingAmount !== undefined ? Number(updateDto.remainingAmount) : 0;
      }

      const savedSale = await manager.save(BranchSale, sale);

      this.cacheService.invalidatePattern(`inventory:${branchId}`);
      this.cacheService.invalidatePattern(`treasury_report_${branchId}`);

      this.activityService.createAuditLog(
        username,
        'تعديل فاتورة مبيعات',
        `تم تعديل الفاتورة #${sale.invoiceNumber || sale.id} بقيمة صافية ${sale.netAmount} ج.م`,
      ).catch(() => {});

      return manager.findOne(BranchSale, {
        where: { id: savedSale.id },
        relations: { items: { product: true }, branch: true, customer: true },
      });
    });
  }
}

