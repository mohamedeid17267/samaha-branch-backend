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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const customer_entity_1 = require("../../database/entities/customer.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const stock_movement_entity_1 = require("../../database/entities/stock-movement.entity");
const transaction_type_enum_1 = require("../enums/transaction-type.enum");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    dataSource;
    logger = new common_1.Logger(ReconciliationService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async reconcileCustomerBalance(customerId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const result = await queryRunner.manager
                .createQueryBuilder(customer_debt_ledger_entity_1.CustomerDebtLedger, 'ledger')
                .select([
                `SUM(CASE WHEN ledger.transactionType = '${transaction_type_enum_1.TransactionType.CHARGE}' THEN ledger.amount ELSE 0 END) as invoiced`,
                `SUM(CASE WHEN ledger.transactionType = '${transaction_type_enum_1.TransactionType.PAYMENT}' THEN ledger.paidAmount ELSE 0 END) as paid`,
            ])
                .where('ledger.customerId = :customerId', { customerId })
                .getRawOne();
            const totalInvoiced = Math.round((Number(result?.invoiced) || 0) * 100) / 100;
            const totalPaid = Math.round((Number(result?.paid) || 0) * 100) / 100;
            const currentDebt = Math.round((totalInvoiced - totalPaid) * 100) / 100;
            await queryRunner.manager.update(customer_entity_1.Customer, customerId, {
                totalInvoiced,
                totalPaid,
                currentDebt,
            });
            await queryRunner.commitTransaction();
            this.logger.log(`[Reconciled Customer ${customerId}] Invoiced: ${totalInvoiced}, Paid: ${totalPaid}, Debt: ${currentDebt}`);
            return { totalInvoiced, totalPaid, currentDebt };
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
    async reconcileStockMovements(productId, branchId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const result = await queryRunner.manager
                .createQueryBuilder(stock_movement_entity_1.StockMovement, 'sm')
                .select('SUM(sm.quantity)', 'totalQuantity')
                .where('sm.productId = :productId AND sm.branchId = :branchId', { productId, branchId })
                .getRawOne();
            const derivedStock = Number(result?.totalQuantity) || 0;
            const isNegative = derivedStock < 0;
            await queryRunner.manager.update(branch_inventory_entity_1.BranchInventory, { productId, branchId }, { currentQuantity: derivedStock });
            if (isNegative) {
                this.logger.warn(`[Inventory Discrepancy Alert] Product ${productId} at Branch ${branchId} has negative derived stock (${derivedStock})`);
            }
            await queryRunner.commitTransaction();
            return { derivedStock, isNegative };
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map