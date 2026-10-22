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
exports.BranchSaleItem = void 0;
const typeorm_1 = require("typeorm");
const branch_sale_entity_1 = require("./branch-sale.entity");
const product_entity_1 = require("./product.entity");
let BranchSaleItem = class BranchSaleItem {
    id;
    saleId;
    sale;
    productId;
    product;
    quantity;
    unitPrice;
    subTotal;
};
exports.BranchSaleItem = BranchSaleItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "saleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_sale_entity_1.BranchSale, (sale) => sale.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'saleId' }),
    __metadata("design:type", branch_sale_entity_1.BranchSale)
], BranchSaleItem.prototype, "sale", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", product_entity_1.Product)
], BranchSaleItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], BranchSaleItem.prototype, "subTotal", void 0);
exports.BranchSaleItem = BranchSaleItem = __decorate([
    (0, typeorm_1.Entity)('branch_sale_items')
], BranchSaleItem);
//# sourceMappingURL=branch-sale-item.entity.js.map