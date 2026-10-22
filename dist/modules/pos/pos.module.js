"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const pos_controller_1 = require("./pos.controller");
const pos_service_1 = require("./pos.service");
const branch_sale_entity_1 = require("../../database/entities/branch-sale.entity");
const branch_sale_item_entity_1 = require("../../database/entities/branch-sale-item.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const stock_movement_entity_1 = require("../../database/entities/stock-movement.entity");
const activity_module_1 = require("../activity/activity.module");
let PosModule = class PosModule {
};
exports.PosModule = PosModule;
exports.PosModule = PosModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([branch_sale_entity_1.BranchSale, branch_sale_item_entity_1.BranchSaleItem, branch_inventory_entity_1.BranchInventory, stock_movement_entity_1.StockMovement]),
            activity_module_1.ActivityModule,
        ],
        controllers: [pos_controller_1.PosController],
        providers: [pos_service_1.PosService],
        exports: [pos_service_1.PosService],
    })
], PosModule);
//# sourceMappingURL=pos.module.js.map