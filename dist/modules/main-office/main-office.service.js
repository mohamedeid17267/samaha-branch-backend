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
exports.MainOfficeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const main_office_expense_entity_1 = require("../../database/entities/main-office-expense.entity");
const import_container_entity_1 = require("../../database/entities/import-container.entity");
const main_office_inventory_entity_1 = require("../../database/entities/main-office-inventory.entity");
const main_office_transaction_entity_1 = require("../../database/entities/main-office-transaction.entity");
const product_entity_1 = require("../../database/entities/product.entity");
const activity_service_1 = require("../activity/activity.service");
const branch_entity_1 = require("../../database/entities/branch.entity");
const branch_sale_entity_1 = require("../../database/entities/branch-sale.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
const branch_expense_entity_1 = require("../../database/entities/branch-expense.entity");
const branch_daily_revenue_entity_1 = require("../../database/entities/branch-daily-revenue.entity");
let MainOfficeService = class MainOfficeService {
    expensesRepo;
    containersRepo;
    inventoryRepo;
    transactionsRepo;
    productRepo;
    branchRepo;
    branchSaleRepo;
    branchInventoryRepo;
    customerRepo;
    supplierRepo;
    branchExpenseRepo;
    branchRevenueRepo;
    activityService;
    constructor(expensesRepo, containersRepo, inventoryRepo, transactionsRepo, productRepo, branchRepo, branchSaleRepo, branchInventoryRepo, customerRepo, supplierRepo, branchExpenseRepo, branchRevenueRepo, activityService) {
        this.expensesRepo = expensesRepo;
        this.containersRepo = containersRepo;
        this.inventoryRepo = inventoryRepo;
        this.transactionsRepo = transactionsRepo;
        this.productRepo = productRepo;
        this.branchRepo = branchRepo;
        this.branchSaleRepo = branchSaleRepo;
        this.branchInventoryRepo = branchInventoryRepo;
        this.customerRepo = customerRepo;
        this.supplierRepo = supplierRepo;
        this.branchExpenseRepo = branchExpenseRepo;
        this.branchRevenueRepo = branchRevenueRepo;
        this.activityService = activityService;
    }
    async getExpenses() {
        return this.expensesRepo.find({ order: { createdAt: 'DESC' } });
    }
    async addExpense(data, username = 'System') {
        const expense = this.expensesRepo.create(data);
        const saved = await this.expensesRepo.save(expense);
        await this.activityService.createAuditLog(username, 'إضافة مصروف', `تم تسجيل مصروف جديد بقيمة ${saved.amount} (البيان: ${saved.description})`);
        return saved;
    }
    async deleteExpense(id) {
        return this.expensesRepo.delete(id);
    }
    async getContainers() {
        return this.containersRepo.find({ order: { createdAt: 'DESC' } });
    }
    async addContainer(data) {
        const container = this.containersRepo.create(data);
        return this.containersRepo.save(container);
    }
    async deleteContainer(id) {
        return this.containersRepo.delete(id);
    }
    async getInventory(containerId) {
        const query = this.inventoryRepo.createQueryBuilder('inv')
            .leftJoinAndSelect('inv.product', 'product')
            .leftJoinAndSelect('inv.container', 'container');
        if (containerId) {
            query.where('inv.containerId = :containerId', { containerId });
        }
        return query.getMany();
    }
    async receiveGoods(containerId, productId, quantity, costPrice, notes) {
        const container = await this.containersRepo.findOne({ where: { id: containerId } });
        if (!container)
            throw new common_1.NotFoundException('Container not found');
        const product = await this.productRepo.findOne({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        let inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
        if (inventory) {
            inventory.quantity += quantity;
            if (costPrice)
                inventory.costPrice = costPrice;
            await this.inventoryRepo.save(inventory);
        }
        else {
            inventory = this.inventoryRepo.create({
                containerId,
                productId,
                quantity,
                costPrice: costPrice || product.costPrice || 0
            });
            await this.inventoryRepo.save(inventory);
        }
        const tx = this.transactionsRepo.create({
            containerId,
            productId,
            type: 'RECEIVE',
            quantity,
            balanceAfter: inventory.quantity,
            notes: notes || 'استلام بضاعة'
        });
        await this.transactionsRepo.save(tx);
        product.globalStock += quantity;
        await this.productRepo.save(product);
        return inventory;
    }
    async withdrawGoods(containerId, productId, quantity, notes) {
        const inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
        if (!inventory)
            throw new common_1.NotFoundException('Inventory not found for this container and product');
        if (inventory.quantity < quantity) {
            throw new common_1.BadRequestException('Not enough quantity in container');
        }
        inventory.quantity -= quantity;
        await this.inventoryRepo.save(inventory);
        const tx = this.transactionsRepo.create({
            containerId,
            productId,
            type: 'WITHDRAW',
            quantity: -quantity,
            balanceAfter: inventory.quantity,
            notes: notes || 'سحب بضاعة'
        });
        await this.transactionsRepo.save(tx);
        const product = await this.productRepo.findOne({ where: { id: productId } });
        if (product) {
            product.globalStock = Math.max(0, product.globalStock - quantity);
            await this.productRepo.save(product);
        }
        return inventory;
    }
    async auditInventory(containerId, productId, actualQuantity, notes) {
        const inventory = await this.inventoryRepo.findOne({ where: { containerId, productId } });
        if (!inventory) {
            return this.receiveGoods(containerId, productId, actualQuantity, undefined, notes || 'تسوية جرد بزيادة');
        }
        const diff = actualQuantity - inventory.quantity;
        if (diff === 0)
            return inventory;
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
    async getBranchesOverview() {
        const branches = await this.branchRepo.find({
            order: { createdAt: 'ASC' },
        });
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const branchSummaries = await Promise.all(branches.map(async (branch) => {
            const branchId = branch.id;
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
                }
                else {
                    cashSalesAmount += net;
                }
                if (s.createdAt && new Date(s.createdAt) >= startOfToday) {
                    todaySalesAmount += net;
                    todaySalesCount++;
                }
            }
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
                }
                else if (qty <= 5) {
                    lowStockCount++;
                }
            }
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
        }));
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
    async getBranchDeepDive(branchId) {
        const branch = await this.branchRepo.findOne({
            where: { id: branchId },
        });
        if (!branch)
            throw new common_1.NotFoundException(`الفرع برقم ${branchId} غير موجود`);
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
};
exports.MainOfficeService = MainOfficeService;
exports.MainOfficeService = MainOfficeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(main_office_expense_entity_1.MainOfficeExpense)),
    __param(1, (0, typeorm_1.InjectRepository)(import_container_entity_1.ImportContainer)),
    __param(2, (0, typeorm_1.InjectRepository)(main_office_inventory_entity_1.MainOfficeInventory)),
    __param(3, (0, typeorm_1.InjectRepository)(main_office_transaction_entity_1.MainOfficeTransaction)),
    __param(4, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(5, (0, typeorm_1.InjectRepository)(branch_entity_1.Branch)),
    __param(6, (0, typeorm_1.InjectRepository)(branch_sale_entity_1.BranchSale)),
    __param(7, (0, typeorm_1.InjectRepository)(branch_inventory_entity_1.BranchInventory)),
    __param(8, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(9, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(10, (0, typeorm_1.InjectRepository)(branch_expense_entity_1.BranchExpense)),
    __param(11, (0, typeorm_1.InjectRepository)(branch_daily_revenue_entity_1.BranchDailyRevenue)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        activity_service_1.ActivityService])
], MainOfficeService);
//# sourceMappingURL=main-office.service.js.map