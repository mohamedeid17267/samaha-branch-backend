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
exports.ImportContainer = void 0;
const typeorm_1 = require("typeorm");
const main_office_inventory_entity_1 = require("./main-office-inventory.entity");
const main_office_transaction_entity_1 = require("./main-office-transaction.entity");
let ImportContainer = class ImportContainer {
    id;
    containerNumber;
    arrivalDate;
    status;
    createdAt;
    updatedAt;
    inventories;
    transactions;
};
exports.ImportContainer = ImportContainer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ImportContainer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ImportContainer.prototype, "containerNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", String)
], ImportContainer.prototype, "arrivalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'OPEN' }),
    __metadata("design:type", String)
], ImportContainer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ImportContainer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ImportContainer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => main_office_inventory_entity_1.MainOfficeInventory, (inv) => inv.container),
    __metadata("design:type", Array)
], ImportContainer.prototype, "inventories", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => main_office_transaction_entity_1.MainOfficeTransaction, (tx) => tx.container),
    __metadata("design:type", Array)
], ImportContainer.prototype, "transactions", void 0);
exports.ImportContainer = ImportContainer = __decorate([
    (0, typeorm_1.Entity)('import_containers')
], ImportContainer);
//# sourceMappingURL=import-container.entity.js.map