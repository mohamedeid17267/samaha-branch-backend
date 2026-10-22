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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryDebtLedger = void 0;
const typeorm_1 = require("typeorm");
const branch_entity_1 = require("./branch.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
let InventoryDebtLedger = class InventoryDebtLedger {
    id;
    branchId;
    branch;
    transactionType;
    relatedOrderId;
    relatedOrder;
    amount;
    balanceAfter;
    description;
    receiptUrl;
    createdAt;
};
exports.InventoryDebtLedger = InventoryDebtLedger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], InventoryDebtLedger.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], InventoryDebtLedger.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, (branch) => branch.debtLedgers, {
        onDelete: 'RESTRICT',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'branchId' }),
    __metadata("design:type", branch_entity_1.Branch)
], InventoryDebtLedger.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: transaction_type_enum_1.TransactionType,
    }),
    __metadata("design:type", String)
], InventoryDebtLedger.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], InventoryDebtLedger.prototype, "relatedOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'relatedOrderId' }),
    __metadata("design:type", Object)
], InventoryDebtLedger.prototype, "relatedOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], InventoryDebtLedger.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], InventoryDebtLedger.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], InventoryDebtLedger.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], InventoryDebtLedger.prototype, "receiptUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], InventoryDebtLedger.prototype, "createdAt", void 0);
exports.InventoryDebtLedger = InventoryDebtLedger = __decorate([
    (0, typeorm_1.Entity)('inventory_debt_ledger')
], InventoryDebtLedger);
//# sourceMappingURL=inventory-debt-ledger.entity.js.map