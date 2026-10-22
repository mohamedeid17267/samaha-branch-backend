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
exports.CustomerDebtLedger = void 0;
const typeorm_1 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const branch_sale_entity_1 = require("./branch-sale.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
let CustomerDebtLedger = class CustomerDebtLedger {
    id;
    customerId;
    customer;
    branchId;
    transactionType;
    invoiceNumber;
    relatedOrderId;
    relatedOrder;
    relatedSaleId;
    relatedSale;
    amount;
    paidAmount;
    balanceAfter;
    paymentMethod;
    description;
    invoiceDate;
    recordedBy;
    receiptUrl;
    createdAt;
};
exports.CustomerDebtLedger = CustomerDebtLedger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, (customer) => customer.debtLedgers, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", customer_entity_1.Customer)
], CustomerDebtLedger.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: transaction_type_enum_1.TransactionType,
    }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], CustomerDebtLedger.prototype, "relatedOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'relatedOrderId' }),
    __metadata("design:type", Object)
], CustomerDebtLedger.prototype, "relatedOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], CustomerDebtLedger.prototype, "relatedSaleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_sale_entity_1.BranchSale, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'relatedSaleId' }),
    __metadata("design:type", Object)
], CustomerDebtLedger.prototype, "relatedSale", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], CustomerDebtLedger.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "invoiceDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], CustomerDebtLedger.prototype, "recordedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], CustomerDebtLedger.prototype, "receiptUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerDebtLedger.prototype, "createdAt", void 0);
exports.CustomerDebtLedger = CustomerDebtLedger = __decorate([
    (0, typeorm_1.Entity)('customer_debt_ledger')
], CustomerDebtLedger);
//# sourceMappingURL=customer-debt-ledger.entity.js.map