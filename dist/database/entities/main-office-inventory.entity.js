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
exports.MainOfficeInventory = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./product.entity");
const import_container_entity_1 = require("./import-container.entity");
let MainOfficeInventory = class MainOfficeInventory {
    id;
    productId;
    product;
    containerId;
    container;
    quantity;
    costPrice;
    createdAt;
    updatedAt;
};
exports.MainOfficeInventory = MainOfficeInventory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MainOfficeInventory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MainOfficeInventory.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", product_entity_1.Product)
], MainOfficeInventory.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MainOfficeInventory.prototype, "containerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => import_container_entity_1.ImportContainer, (container) => container.inventories, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'containerId' }),
    __metadata("design:type", import_container_entity_1.ImportContainer)
], MainOfficeInventory.prototype, "container", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MainOfficeInventory.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MainOfficeInventory.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MainOfficeInventory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MainOfficeInventory.prototype, "updatedAt", void 0);
exports.MainOfficeInventory = MainOfficeInventory = __decorate([
    (0, typeorm_1.Entity)('main_office_inventories'),
    (0, typeorm_1.Unique)(['productId', 'containerId'])
], MainOfficeInventory);
//# sourceMappingURL=main-office-inventory.entity.js.map