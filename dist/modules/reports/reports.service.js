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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const branch_synced_report_entity_1 = require("../../database/entities/branch-synced-report.entity");
let ReportsService = class ReportsService {
    branchReportRepo;
    dataSource;
    constructor(branchReportRepo, dataSource) {
        this.branchReportRepo = branchReportRepo;
        this.dataSource = dataSource;
    }
    async getFinancialSummary(startDate, endDate) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            let dateFilter = '';
            const params = [];
            if (startDate && endDate) {
                dateFilter = `AND createdAt >= ? AND createdAt <= ?`;
                params.push(new Date(startDate), new Date(endDate));
            }
            const hqSalesQuery = await queryRunner.query(`SELECT SUM(totalAmount) as total, SUM(paidAmount) as paid FROM purchase_orders WHERE status != 'CANCELLED' ${dateFilter}`, params);
            const hqSales = Number(hqSalesQuery[0]?.total || 0);
            const hqPaid = Number(hqSalesQuery[0]?.paid || 0);
            const posSales = 0;
            const branchDebtsQuery = await queryRunner.query(`
        SELECT 
          COALESCE((SELECT SUM(balanceAfter) FROM (SELECT balanceAfter, ROW_NUMBER() OVER(PARTITION BY branchId ORDER BY id DESC) as rn FROM inventory_debt_ledger) t WHERE t.rn = 1), 0) +
          COALESCE((SELECT SUM(balanceAfter) FROM (SELECT balanceAfter, ROW_NUMBER() OVER(PARTITION BY branchId ORDER BY id DESC) as rn FROM brand_royalty_ledger) t WHERE t.rn = 1), 0) as total
      `);
            const branchDebts = Number(branchDebtsQuery[0]?.total || 0);
            const customerDebtsQuery = await queryRunner.query(`SELECT SUM(currentDebt) as total FROM customers`);
            const customerDebts = Number(customerDebtsQuery[0]?.total || 0);
            const assemblyRevenuesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM brand_royalty_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`, params);
            const assemblyRevenues = Number(assemblyRevenuesQuery[0]?.total || 0);
            const assemblyChargesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM brand_royalty_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`, params);
            const assemblyTotalRevenues = Number(assemblyChargesQuery[0]?.total || 0);
            const inventoryRevenuesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM inventory_debt_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`, params);
            const inventoryRevenues = Number(inventoryRevenuesQuery[0]?.total || 0);
            const inventoryChargesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM inventory_debt_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`, params);
            const inventoryTotalRevenues = Number(inventoryChargesQuery[0]?.total || 0);
            const customerRevenuesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM customer_debt_ledger WHERE transactionType = 'PAYMENT' ${dateFilter}`, params);
            const customerRevenues = Number(customerRevenuesQuery[0]?.total || 0);
            const customerChargesQuery = await queryRunner.query(`SELECT SUM(amount) as total FROM customer_debt_ledger WHERE transactionType = 'CHARGE' ${dateFilter}`, params);
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
        }
        finally {
            await queryRunner.release();
        }
    }
    async getInventorySummary() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            const hqInventoryQuery = await queryRunner.query(`SELECT SUM(globalStock * standardDistributerPrice) as total FROM products`);
            const hqInventoryValue = Number(hqInventoryQuery[0]?.total || 0);
            const branchInventoryQuery = await queryRunner.query(`SELECT SUM(bi.currentQuantity * p.standardDistributerPrice) as total 
         FROM branch_inventories bi 
         JOIN products p ON p.id = bi.productId`);
            const branchInventoryValue = Number(branchInventoryQuery[0]?.total || 0);
            const lowStockQuery = await queryRunner.query(`SELECT COUNT(id) as count FROM products WHERE globalStock < 20`);
            const lowStockItemsCount = Number(lowStockQuery[0]?.count || 0);
            return {
                hqInventoryValue,
                branchInventoryValue,
                totalInventoryValue: hqInventoryValue + branchInventoryValue,
                lowStockItemsCount,
            };
        }
        finally {
            await queryRunner.release();
        }
    }
    async getSalesDetails(startDate, endDate) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            let dateFilter = '';
            const params = [];
            if (startDate && endDate) {
                dateFilter = `WHERE po.createdAt >= ? AND po.createdAt <= ?`;
                params.push(new Date(startDate), new Date(endDate));
            }
            const salesQuery = await queryRunner.query(`SELECT po.id, po.createdAt, po.totalAmount, po.paidAmount, po.status,
                po.discountPercentage,
                b.name as branchName,
                c.name as customerName
         FROM purchase_orders po
         LEFT JOIN branches b ON b.id = po.branchId
         LEFT JOIN customers c ON c.id = po.customerId
         ${dateFilter}
         ORDER BY po.createdAt DESC`, params);
            return salesQuery;
        }
        finally {
            await queryRunner.release();
        }
    }
    async ingestBranchReport(dto) {
        const repo = this.branchReportRepo;
        let report = await repo.findOne({
            where: {
                branchCode: dto.branchCode,
                reportDate: dto.reportDate,
            },
        });
        const totalSales = Number(dto.totalSales || 0);
        const totalExpenses = Number(dto.totalExpenses || 0);
        const calculatedProfit = dto.netProfit !== undefined ? Number(dto.netProfit) : totalSales - totalExpenses;
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
        }
        else {
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
    async getUnifiedBranchReports(startDate, endDate, branchCode) {
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
        const branchAggregates = {};
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(branch_synced_report_entity_1.BranchSyncedReport)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], ReportsService);
//# sourceMappingURL=reports.service.js.map