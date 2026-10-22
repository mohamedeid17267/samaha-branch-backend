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
exports.Branch = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const branch_inventory_entity_1 = require("./branch-inventory.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const brand_royalty_ledger_entity_1 = require("./brand-royalty-ledger.entity");
const inventory_debt_ledger_entity_1 = require("./inventory-debt-ledger.entity");
const branch_expense_entity_1 = require("./branch-expense.entity");
const branch_daily_revenue_entity_1 = require("./branch-daily-revenue.entity");
let Branch = class Branch {
    id;
    name;
    location;
    status;
    monthlyRoyalty;
    royaltyDueDay;
    createdAt;
    updatedAt;
    users;
    inventories;
    purchaseOrders;
    royaltyLedgers;
    debtLedgers;
    expenses;
    dailyRevenues;
};
exports.Branch = Branch;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Branch.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Branch.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Branch.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'ACTIVE' }),
    __metadata("design:type", String)
], Branch.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], Branch.prototype, "monthlyRoyalty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 5 }),
    __metadata("design:type", Number)
], Branch.prototype, "royaltyDueDay", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Branch.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Branch.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, (user) => user.branch),
    __metadata("design:type", Array)
], Branch.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => branch_inventory_entity_1.BranchInventory, (inventory) => inventory.branch),
    __metadata("design:type", Array)
], Branch.prototype, "inventories", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_entity_1.PurchaseOrder, (order) => order.branch),
    __metadata("design:type", Array)
], Branch.prototype, "purchaseOrders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => brand_royalty_ledger_entity_1.BrandRoyaltyLedger, (ledger) => ledger.branch),
    __metadata("design:type", Array)
], Branch.prototype, "royaltyLedgers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => inventory_debt_ledger_entity_1.InventoryDebtLedger, (ledger) => ledger.branch),
    __metadata("design:type", Array)
], Branch.prototype, "debtLedgers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => branch_expense_entity_1.BranchExpense, (expense) => expense.branch),
    __metadata("design:type", Array)
], Branch.prototype, "expenses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => branch_daily_revenue_entity_1.BranchDailyRevenue, (revenue) => revenue.branch),
    __metadata("design:type", Array)
], Branch.prototype, "dailyRevenues", void 0);
exports.Branch = Branch = __decorate([
    (0, typeorm_1.Entity)('branches')
], Branch);
//# sourceMappingURL=branch.entity.js.map