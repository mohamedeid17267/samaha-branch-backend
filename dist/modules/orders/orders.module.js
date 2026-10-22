"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const orders_service_1 = require("./orders.service");
const orders_controller_1 = require("./orders.controller");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const order_item_entity_1 = require("../../database/entities/order-item.entity");
const product_entity_1 = require("../../database/entities/product.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const inventory_debt_ledger_entity_1 = require("../../database/entities/inventory-debt-ledger.entity");
const stock_movement_entity_1 = require("../../database/entities/stock-movement.entity");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                purchase_order_entity_1.PurchaseOrder,
                order_item_entity_1.OrderItem,
                product_entity_1.Product,
                branch_inventory_entity_1.BranchInventory,
                inventory_debt_ledger_entity_1.InventoryDebtLedger,
                stock_movement_entity_1.StockMovement,
            ]),
        ],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map