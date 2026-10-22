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
exports.MainOfficeTransaction = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./product.entity");
const import_container_entity_1 = require("./import-container.entity");
let MainOfficeTransaction = class MainOfficeTransaction {
    id;
    productId;
    product;
    containerId;
    container;
    type;
    quantity;
    balanceAfter;
    notes;
    createdAt;
};
exports.MainOfficeTransaction = MainOfficeTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MainOfficeTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MainOfficeTransaction.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", product_entity_1.Product)
], MainOfficeTransaction.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MainOfficeTransaction.prototype, "containerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => import_container_entity_1.ImportContainer, (container) => container.transactions, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'containerId' }),
    __metadata("design:type", import_container_entity_1.ImportContainer)
], MainOfficeTransaction.prototype, "container", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MainOfficeTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MainOfficeTransaction.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], MainOfficeTransaction.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MainOfficeTransaction.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MainOfficeTransaction.prototype, "createdAt", void 0);
exports.MainOfficeTransaction = MainOfficeTransaction = __decorate([
    (0, typeorm_1.Entity)('main_office_transactions')
], MainOfficeTransaction);
//# sourceMappingURL=main-office-transaction.entity.js.map