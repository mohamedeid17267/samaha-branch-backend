import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MainOfficeExpense } from '../../database/entities/main-office-expense.entity';
import { ImportContainer } from '../../database/entities/import-container.entity';
import { MainOfficeInventory } from '../../database/entities/main-office-inventory.entity';
import { MainOfficeTransaction } from '../../database/entities/main-office-transaction.entity';
import { Product } from '../../database/entities/product.entity';
import { ActivityService } from '../activity/activity.service';

import { Branch } from '../../database/entities/branch.entity';
import { BranchSale } from '../../database/entities/branch-sale.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { BranchExpense } from '../../database/entities/branch-expense.entity';
import { BranchDailyRevenue } from '../../database/entities/branch-daily-revenue.entity';

@Injectable()
export class MainOfficeService {
  constructor(
    @InjectRepository(MainOfficeExpense)
    private expensesRepo: Repository<MainOfficeExpense>,
    @InjectRepository(ImportContainer)
    private containersRepo: Repository<ImportContainer>,
    @InjectRepository(MainOfficeInventory)
    private inventoryRepo: Repository<MainOfficeInventory>,
    @InjectRepository(MainOfficeTransaction)
    private transactionsRepo: Repository<MainOfficeTransaction>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
    @InjectRepository(BranchSale)
    private branchSaleRepo: Repository<BranchSale>,
    @InjectRepository(BranchInventory)
    private branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(BranchExpense)
    private branchExpenseRepo: Repository<BranchExpense>,
    @InjectRepository(BranchDailyRevenue)
    private branchRevenueRepo: Repository<BranchDailyRevenue>,
    private activityService: ActivityService,
  ) {}

  // Expenses
  async getExpenses() {
    return this.expensesRepo.find({ order: { createdAt: 'DESC' } });
  }
  async addExpense(data: any, username: string = 'System') {
    const expense = this.expensesRepo.create(data as Partial<MainOfficeExpense>);
    const saved = await this.expensesRepo.save(expense);
    await this.activityService.createAuditLog(
      username,
      'إضافة مصروف',
      `تم تسجيل مصروف جديد بقيمة ${saved.amount} (البيان: ${saved.description})`
    );
    return saved;
  }
  async deleteExpense(id: number) {
    return this.expensesRepo.delete(id);
  }

  // Containers
  async getContainers() {
    return this.containersRepo.find({ order: { createdAt: 'DESC' } });
  }
  async addContainer(data: any) {
    const container = this.containersRepo.create(data);
    return this.containersRepo.save(container);
  }
  async deleteContainer(id: number) {
    return this.containersRepo.delete(id);
  }

  // Inventory
  async getInventory(containerId?: number) {
    const query = this.inventoryRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.product', 'product')
      .leftJoinAndSelect('inv.container', 'container');
      
    if (containerId) {
      query.where('inv.containerId = :containerId', { containerId });
    }
    
    return query.getMany();
  }

  // Receive Goods
  async receiveGoods(containerId: number, productId: number, quantity: number, costPrice?: number, notes?: string) {
    const container = await this.containersRepo.findOne({ where: { id: containerId } });
    if (!container) throw new NotFoundException('Container not found');

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    let inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
    
    if (inventory) {
      inventory.quantity += quantity;
      if (costPrice) inventory.costPrice = costPrice;
      await this.inventoryRepo.save(inventory);
    } else {
      inventory = this.inventoryRepo.create({
        containerId,
        productId,
        quantity,
        costPrice: costPrice || product.costPrice || 0
      });
      await this.inventoryRepo.save(inventory);
    }

    // record transaction
    const tx = this.transactionsRepo.create({
      containerId,
      productId,
      type: 'RECEIVE',
      quantity,
      balanceAfter: inventory.quantity,
      notes: notes || 'استلام بضاعة'
    });
    await this.transactionsRepo.save(tx);
    
    // increase global stock
    product.globalStock += quantity;
    await this.productRepo.save(product);

    return inventory;
  }

  // Withdraw Goods
  async withdrawGoods(containerId: number, productId: number, quantity: number, notes?: string) {
    const inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
    if (!inventory) throw new NotFoundException('Inventory not found for this container and product');
    
    if (inventory.quantity < quantity) {
      throw new BadRequestException('Not enough quantity in container');
    }

    inventory.quantity -= quantity;
    await this.inventoryRepo.save(inventory);

    // record transaction
    const tx = this.transactionsRepo.create({
      containerId,
      productId,
      type: 'WITHDRAW',
      quantity: -quantity,
      balanceAfter: inventory.quantity,
      notes: notes || 'سحب بضاعة'
    });
    await this.transactionsRepo.save(tx);

    // decrease global stock
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (product) {
        product.globalStock = Math.max(0, product.globalStock - quantity);
        await this.productRepo.save(product);
    }

    return inventory;
  }

  // Audit
  async auditInventory(containerId: number, productId: number, actualQuantity: number, notes?: string) {
    const inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
    if (!inventory) {
      // create it if not found but auditing
      return this.receiveGoods(containerId, productId, actualQuantity, undefined, notes || 'تسوية جرد بزيادة');
    }

    const diff = actualQuantity - inventory.quantity;
    if (diff === 0) return inventory;

    inventory.quantity = actualQuantity;
    await this.inventoryRepo.save(inventory);

    const tx = this.transactionsRepo.create({
      containerId,
      productId,
      type: 'AUDIT',
      quantity: diff,
      balanceAfter: inventory.quantity,
      notes: notes || 'تسوية جرد'
    });
    await this.transactionsRepo.save(tx);

    // adjust global stock
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (product) {
        product.globalStock += diff;
        await this.productRepo.save(product);
    }

    return inventory;
  }

  async getTransactions() {
    return this.transactionsRepo.find({
      relations: { product: true, container: true },
      order: { createdAt: 'DESC' }
    });
  }

  // Executive Management: Multi-Branch Overview
  async getBranchesOverview() {
    const branches = await this.branchRepo.find({
      order: { createdAt: 'ASC' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const branchSummaries = await Promise.all(
      branches.map(async (branch) => {
        const branchId = branch.id;

        // 1. Sales
        const sales = await this.branchSaleRepo.find({
          where: { branchId },
          order: { createdAt: 'DESC' },
        });

        let totalSalesAmount = 0;
        let cashSalesAmount = 0;
        let visaSalesAmount = 0;
        let todaySalesAmount = 0;
        let todaySalesCount = 0;

        for (const s of sales) {
          const net = Number(s.netAmount) || 0;
          totalSalesAmount += net;
          if (s.paymentMethod === 'VISA') {
            visaSalesAmount += net;
          } else {
            cashSalesAmount += net;
          }
          if (s.createdAt && new Date(s.createdAt) >= startOfToday) {
            todaySalesAmount += net;
            todaySalesCount++;
          }
        }

        // 2. Inventory
        const inventory = await this.branchInventoryRepo.find({
          where: { branchId },
          relations: { product: true },
        });

        let totalStockQuantity = 0;
        let totalStockValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (const inv of inventory) {
          const qty = Number(inv.currentQuantity) || 0;
          const price = Number(inv.sellingPrice) || Number(inv.product?.standardDistributerPrice) || Number(inv.product?.costPrice) || 0;
          totalStockQuantity += qty;
          totalStockValue += qty * price;
          if (qty <= 0) {
            outOfStockCount++;
          } else if (qty <= 5) {
            lowStockCount++;
          }
        }

        // 3. Customers
        const branchCustomers = await this.customerRepo.find({
          where: { branchId },
        });
        let totalCustomerDebt = 0;
        let totalCustomerInvoiced = 0;
        let totalCustomerPaid = 0;
        for (const c of branchCustomers) {
          totalCustomerDebt += Number(c.currentDebt) || 0;
          totalCustomerInvoiced += Number(c.totalInvoiced) || 0;
          totalCustomerPaid += Number(c.totalPaid) || 0;
        }

        // 4. Suppliers
        const branchSuppliers = await this.supplierRepo.find({
          where: { branchId },
        });
        let totalSupplierDebt = 0;
        let totalSupplierInvoiced = 0;
        let totalSupplierPaid = 0;
        for (const s of branchSuppliers) {
          totalSupplierDebt += Number(s.currentDebt) || 0;
          totalSupplierInvoiced += Number(s.totalInvoiced) || 0;
          totalSupplierPaid += Number(s.totalPaid) || 0;
        }

        // 5. Safe / Financials
        const expenses = await this.branchExpenseRepo.find({ where: { branchId } });
        const revenues = await this.branchRevenueRepo.find({ where: { branchId } });
        const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalRevenues = revenues.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
        const safeBalance = totalRevenues - totalExpenses;

        return {
          id: branch.id,
          name: branch.name,
          location: branch.location,
          status: branch.status,
          monthlyRoyalty: Number(branch.monthlyRoyalty) || 0,
          sales: {
            totalAmount: totalSalesAmount,
            invoicesCount: sales.length,
            cashAmount: cashSalesAmount,
            visaAmount: visaSalesAmount,
            todayAmount: todaySalesAmount,
            todayCount: todaySalesCount,
          },
          inventory: {
            itemsCount: inventory.length,
            totalQuantity: totalStockQuantity,
            totalValue: totalStockValue,
            lowStockCount,
            outOfStockCount,
          },
          customers: {
            count: branchCustomers.length,
            totalDebt: totalCustomerDebt,
            totalInvoiced: totalCustomerInvoiced,
            totalPaid: totalCustomerPaid,
          },
          suppliers: {
            count: branchSuppliers.length,
            totalDebt: totalSupplierDebt,
            totalInvoiced: totalSupplierInvoiced,
            totalPaid: totalSupplierPaid,
          },
          safe: {
            totalRevenues,
            totalExpenses,
            balance: safeBalance,
          },
        };
      }),
    );

    // Enterprise Totals
    const enterprise = {
      totalBranches: branches.length,
      activeBranches: branches.filter((b) => b.status === 'ACTIVE').length,
      totalSales: branchSummaries.reduce((sum, b) => sum + b.sales.totalAmount, 0),
      totalSalesCount: branchSummaries.reduce((sum, b) => sum + b.sales.invoicesCount, 0),
      todaySales: branchSummaries.reduce((sum, b) => sum + b.sales.todayAmount, 0),
      todaySalesCount: branchSummaries.reduce((sum, b) => sum + b.sales.todayCount, 0),
      totalStockQuantity: branchSummaries.reduce((sum, b) => sum + b.inventory.totalQuantity, 0),
      totalStockValue: branchSummaries.reduce((sum, b) => sum + b.inventory.totalValue, 0),
      totalLowStockItems: branchSummaries.reduce((sum, b) => sum + b.inventory.lowStockCount + b.inventory.outOfStockCount, 0),
      totalCustomerReceivables: branchSummaries.reduce((sum, b) => sum + b.customers.totalDebt, 0),
      totalSupplierPayables: branchSummaries.reduce((sum, b) => sum + b.suppliers.totalDebt, 0),
      totalCashInSafes: branchSummaries.reduce((sum, b) => sum + b.safe.balance, 0),
    };

    return {
      enterprise,
      branches: branchSummaries,
    };
  }

  // Detailed snapshot for a single branch
  async getBranchDeepDive(branchId: number) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
    });
    if (!branch) throw new NotFoundException(`الفرع برقم ${branchId} غير موجود`);

    const [sales, inventory, customers, suppliers, expenses, revenues] = await Promise.all([
      this.branchSaleRepo.find({
        where: { branchId },
        relations: { items: { product: true }, customer: true },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
      this.branchInventoryRepo.find({
        where: { branchId },
        relations: { product: true },
        order: { currentQuantity: 'ASC' },
      }),
      this.customerRepo.find({
        where: { branchId },
        order: { currentDebt: 'DESC' },
      }),
      this.supplierRepo.find({
        where: { branchId },
        order: { currentDebt: 'DESC' },
      }),
      this.branchExpenseRepo.find({
        where: { branchId },
        order: { expenseDate: 'DESC' },
      }),
      this.branchRevenueRepo.find({
        where: { branchId },
        order: { revenueDate: 'DESC' },
      }),
    ]);

    const totalSalesAmount = sales.reduce((sum, s) => sum + (Number(s.netAmount) || 0), 0);
    const totalInventoryValue = inventory.reduce((sum, inv) => {
      const q = Number(inv.currentQuantity) || 0;
      const p = Number(inv.sellingPrice) || Number(inv.product?.standardDistributerPrice) || Number(inv.product?.costPrice) || 0;
      return sum + q * p;
    }, 0);
    const totalCustomerDebt = customers.reduce((sum, c) => sum + (Number(c.currentDebt) || 0), 0);
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (Number(s.currentDebt) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalRevenues = revenues.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    return {
      branch,
      sales,
      inventory,
      customers,
      suppliers,
      expenses,
      revenues,
      summary: {
        totalSalesAmount,
        invoicesCount: sales.length,
        totalInventoryValue,
        inventoryCount: inventory.length,
        totalCustomerDebt,
        customersCount: customers.length,
        totalSupplierDebt,
        suppliersCount: suppliers.length,
        totalExpenses,
        totalRevenues,
        safeBalance: totalRevenues - totalExpenses,
      },
    };
  }
}
