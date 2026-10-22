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
exports.BranchSale = void 0;
const typeorm_1 = require("typeorm");
const branch_entity_1 = require("./branch.entity");
const branch_sale_item_entity_1 = require("./branch-sale-item.entity");
const customer_entity_1 = require("./customer.entity");
let BranchSale = class BranchSale {
    id;
    branchId;
    branch;
    totalAmount;
    discount;
    netAmount;
    paymentMethod;
    saleType;
    status;
    customerName;
    customerId;
    customer;
    paidAmount;
    remainingAmount;
    items;
    createdAt;
    updatedAt;
};
exports.BranchSale = BranchSale;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BranchSale.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], BranchSale.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, (branch) => branch.id, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'branchId' }),
    __metadata("design:type", branch_entity_1.Branch)
], BranchSale.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BranchSale.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BranchSale.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BranchSale.prototype, "netAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'CASH' }),
    __metadata("design:type", String)
], BranchSale.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'RETAIL' }),
    __metadata("design:type", String)
], BranchSale.prototype, "saleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'COMPLETED' }),
    __metadata("design:type", String)
], BranchSale.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BranchSale.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], BranchSale.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, (customer) => customer.sales, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", customer_entity_1.Customer)
], BranchSale.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BranchSale.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BranchSale.prototype, "remainingAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => branch_sale_item_entity_1.BranchSaleItem, (item) => item.sale, { cascade: true }),
    __metadata("design:type", Array)
], BranchSale.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BranchSale.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BranchSale.prototype, "updatedAt", void 0);
exports.BranchSale = BranchSale = __decorate([
    (0, typeorm_1.Entity)('branch_sales')
], BranchSale);
//# sourceMappingURL=branch-sale.entity.js.map