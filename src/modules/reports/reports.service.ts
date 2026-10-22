import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BranchSyncedReport } from '../../database/entities/branch-synced-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BranchSyncedReport)
    private branchReportRepo: Repository<BranchSyncedReport>,
    private dataSource: DataSource,
  ) {}

  async getFinancialSummary(startDate?: string, endDate?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Base date filter condition
      let dateFilter = '';
      const params: any[] = [];
      if (startDate && endDate) {
        dateFilter = `AND createdAt >= ? AND createdAt <= ?`;
        params.push(new Date(startDate), new Date(endDate));
      }

      // 1. HQ Sales (PurchaseOrders)
      const hqSalesQuery = await queryRunner.query(
        `SELECT SUM(totalAmount) as total, SUM(paidAmount) as paid FROM purchase_orders WHERE status != 'CANCELLED' ${dateFilter}`,
        params,
      );
      
      const hqSales = Number(hqSalesQuery[0]?.total || 0);
      const hqPaid = Number(hqSalesQuery[0]?.paid || 0);

      // 2. POS Branch Sales (Removed per user request: HQ doesn't track branch daily POS)
      const posSales = 0;

      const branchDebtsQuery = await queryRunner.query(`
        SELECT 
          COALESCE((SELECT SUM(balanceAfter) FROM (SELECT balanceAfter, ROW_NUMBER() OVER(PARTITION BY branchId ORDER BY id DESC) as rn FROM inventory_debt_ledger) t WHERE t.rn = 1), 0) +
          COALESCE((SELECT SUM(balanceAfter) FROM (SELECT balanceAfter, ROW_NUMBER() OVER(PARTITION BY branchId ORDER BY id DESC) as rn FROM brand_royalty_ledger) t WHERE t.rn = 1), 0) as total
      `);
      const branchDebts = Number(branchDebtsQuery[0]?.total || 0);

      const customerDebtsQuery = await queryRunner.query(
        `SELECT SUM(currentDebt) as total FROM customers`,
      );
      const customerDebts = Number(customerDebtsQuery[0]?.total || 0);

      // 4. Assembly Revenues (Brand Royalty Payments and Charges)
      const assemblyRevenuesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM brand_royalty_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`,
        params,
      );
      const assemblyRevenues = Number(assemblyRevenuesQuery[0]?.total || 0);

      const assemblyChargesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM brand_royalty_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`,
        params,
      );
      const assemblyTotalRevenues = Number(assemblyChargesQuery[0]?.total || 0);

      // 5. Inventory Revenues (Inventory Debt Payments and Charges)
      const inventoryRevenuesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM inventory_debt_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`,
        params,
      );
      const inventoryRevenues = Number(inventoryRevenuesQuery[0]?.total || 0);

      const inventoryChargesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM inventory_debt_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`,
        params,
      );
      const inventoryTotalRevenues = Number(inventoryChargesQuery[0]?.total || 0);

      // 6. Customer Revenues
      const customerRevenuesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM customer_debt_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`,
        params,
      );
      const customerRevenues = Number(customerRevenuesQuery[0]?.total || 0);

      const customerChargesQuery = await queryRunner.query(
        `SELECT SUM(amount) as total FROM customer_debt_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`,
        params,
      );
      const customerTotalRevenues = Number(customerChargesQuery[0]?.total || 0);

      return {
        hqSales,
        hqPaid,
        hqDebts: hqSales - hqPaid,
        posSales,
        branchDebts,
        customerDebts,
        totalOutstandingDebts: branchDebts + customerDebts,
        assemblyTotalRevenues,
        assemblyRevenues,
        assemblyDebts: assemblyTotalRevenues - assemblyRevenues,
        inventoryTotalRevenues,
        inventoryRevenues,
        inventoryDebts: inventoryTotalRevenues - inventoryRevenues,
        customerTotalRevenues,
        customerRevenues,
        customerDebtsCalculated: customerTotalRevenues - customerRevenues,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getInventorySummary() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Global HQ Inventory Value
      const hqInventoryQuery = await queryRunner.query(
        `SELECT SUM(globalStock * standardDistributerPrice) as total FROM products`,
      );
      const hqInventoryValue = Number(hqInventoryQuery[0]?.total || 0);

      // Branches Inventory Value
      const branchInventoryQuery = await queryRunner.query(
        `SELECT SUM(bi.currentQuantity * p.standardDistributerPrice) as total 
         FROM branch_inventories bi 
         JOIN products p ON p.id = bi.productId`,
      );
      const branchInventoryValue = Number(branchInventoryQuery[0]?.total || 0);

      // Low Stock Items (Global)
      const lowStockQuery = await queryRunner.query(
        `SELECT COUNT(id) as count FROM products WHERE globalStock < 20`,
      );
      const lowStockItemsCount = Number(lowStockQuery[0]?.count || 0);

      return {
        hqInventoryValue,
        branchInventoryValue,
        totalInventoryValue: hqInventoryValue + branchInventoryValue,
        lowStockItemsCount,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getSalesDetails(startDate?: string, endDate?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let dateFilter = '';
      const params: any[] = [];
      if (startDate && endDate) {
        dateFilter = `WHERE po.createdAt >= ? AND po.createdAt <= ?`;
        params.push(new Date(startDate), new Date(endDate));
      }

      // Detailed Purchase Orders with targets
      const salesQuery = await queryRunner.query(
        `SELECT po.id, po.createdAt, po.totalAmount, po.paidAmount, po.status,
                po.discountPercentage,
                b.name as branchName,
                c.name as customerName
         FROM purchase_orders po
         LEFT JOIN branches b ON b.id = po.branchId
         LEFT JOIN customers c ON c.id = po.customerId
         ${dateFilter}
         ORDER BY po.createdAt DESC`,
        params,
      );

      return salesQuery;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // UNIFIED BRANCH REPORTING & INGESTION (HUB & SPOKE ENGINE)
  // ============================================================

  async ingestBranchReport(dto: any) {
    const repo = this.branchReportRepo;

    let report = await repo.findOne({
      where: {
        branchCode: dto.branchCode,
        reportDate: dto.reportDate,
      },
    });

    const totalSales = Number(dto.totalSales || 0);
    const totalExpenses = Number(dto.totalExpenses || 0);
    const calculatedProfit =
      dto.netProfit !== undefined ? Number(dto.netProfit) : totalSales - totalExpenses;

    if (report) {
      report.branchName = dto.branchName || report.branchName;
      report.totalSales = totalSales;
      report.totalOrders = Number(dto.totalOrders || 0);
      report.cashSales = Number(dto.cashSales || 0);
      report.visaSales = Number(dto.visaSales || 0);
      report.totalExpenses = totalExpenses;
      report.netProfit = calculatedProfit;
      report.currentStockValue = Number(dto.currentStockValue || 0);
      report.notes = dto.notes !== undefined ? dto.notes : report.notes;
      report.rawDetails = dto.rawDetails !== undefined ? dto.rawDetails : report.rawDetails;
      report.syncStatus = 'SYNCED';
    } else {
      report = repo.create({
        branchCode: dto.branchCode,
        branchName: dto.branchName,
        reportDate: dto.reportDate,
        totalSales,
        totalOrders: Number(dto.totalOrders || 0),
        cashSales: Number(dto.cashSales || 0),
        visaSales: Number(dto.visaSales || 0),
        totalExpenses,
        netProfit: calculatedProfit,
        currentStockValue: Number(dto.currentStockValue || 0),
        notes: dto.notes || null,
        rawDetails: dto.rawDetails || null,
        syncStatus: 'SYNCED',
      });
    }

    const saved = await repo.save(report);
    return {
      success: true,
      message: `تمت مزامنة تقرير فرع (${dto.branchName}) ليوم ${dto.reportDate} بنجاح في الإدارة المركزية`,
      reportId: saved.id,
      data: saved,
    };
  }

  async getUnifiedBranchReports(startDate?: string, endDate?: string, branchCode?: string) {
    const repo = this.branchReportRepo;
    const qb = repo.createQueryBuilder('r');

    if (startDate && endDate) {
      qb.andWhere('r.reportDate >= :startDate AND r.reportDate <= :endDate', {
        startDate,
        endDate,
      });
    }
    if (branchCode) {
      qb.andWhere('r.branchCode = :branchCode', { branchCode });
    }

    qb.orderBy('r.reportDate', 'DESC').addOrderBy('r.totalSales', 'DESC');
    const reports = await qb.getMany();

    let totalSales = 0;
    let totalOrders = 0;
    let totalCash = 0;
    let totalVisa = 0;
    let totalExpenses = 0;
    let totalNetProfit = 0;

    const branchAggregates: Record<
      string,
      {
        branchCode: string;
        branchName: string;
        daysReported: number;
        totalSales: number;
        totalExpenses: number;
        netProfit: number;
        totalOrders: number;
        totalCash: number;
        totalVisa: number;
        lastSyncDate: string;
        lastStockValue: number;
      }
    > = {};

    for (const r of reports) {
      const sales = Number(r.totalSales);
      const orders = Number(r.totalOrders);
      const cash = Number(r.cashSales);
      const visa = Number(r.visaSales);
      const expenses = Number(r.totalExpenses);
      const profit = Number(r.netProfit);
      const stock = Number(r.currentStockValue);

      totalSales += sales;
      totalOrders += orders;
      totalCash += cash;
      totalVisa += visa;
      totalExpenses += expenses;
      totalNetProfit += profit;

      if (!branchAggregates[r.branchCode]) {
        branchAggregates[r.branchCode] = {
          branchCode: r.branchCode,
          branchName: r.branchName,
          daysReported: 0,
          totalSales: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalOrders: 0,
          totalCash: 0,
          totalVisa: 0,
          lastSyncDate: r.reportDate,
          lastStockValue: stock,
        };
      }

      branchAggregates[r.branchCode].daysReported += 1;
      branchAggregates[r.branchCode].totalSales += sales;
      branchAggregates[r.branchCode].totalOrders += orders;
      branchAggregates[r.branchCode].totalCash += cash;
      branchAggregates[r.branchCode].totalVisa += visa;
      branchAggregates[r.branchCode].totalExpenses += expenses;
      branchAggregates[r.branchCode].netProfit += profit;
      if (r.reportDate >= branchAggregates[r.branchCode].lastSyncDate) {
        branchAggregates[r.branchCode].lastSyncDate = r.reportDate;
        branchAggregates[r.branchCode].lastStockValue = stock;
      }
    }

    return {
      summary: {
        totalSales,
        totalOrders,
        totalCash,
        totalVisa,
        totalExpenses,
        totalNetProfit,
        branchesCount: Object.keys(branchAggregates).length,
      },
      branches: Object.values(branchAggregates),
      records: reports,
    };
  }
}

