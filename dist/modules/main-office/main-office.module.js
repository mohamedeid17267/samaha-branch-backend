"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainOfficeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const main_office_controller_1 = require("./main-office.controller");
const main_office_service_1 = require("./main-office.service");
const main_office_expense_entity_1 = require("../../database/entities/main-office-expense.entity");
const import_container_entity_1 = require("../../database/entities/import-container.entity");
const main_office_inventory_entity_1 = require("../../database/entities/main-office-inventory.entity");
const main_office_transaction_entity_1 = require("../../database/entities/main-office-transaction.entity");
const product_entity_1 = require("../../database/entities/product.entity");
const activity_module_1 = require("../activity/activity.module");
const branch_entity_1 = require("../../database/entities/branch.entity");
const branch_sale_entity_1 = require("../../database/entities/branch-sale.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
const branch_expense_entity_1 = require("../../database/entities/branch-expense.entity");
const branch_daily_revenue_entity_1 = require("../../database/entities/branch-daily-revenue.entity");
let MainOfficeModule = class MainOfficeModule {
};
exports.MainOfficeModule = MainOfficeModule;
exports.MainOfficeModule = MainOfficeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            activity_module_1.ActivityModule,
            typeorm_1.TypeOrmModule.forFeature([
                main_office_expense_entity_1.MainOfficeExpense,
                import_container_entity_1.ImportContainer,
                main_office_inventory_entity_1.MainOfficeInventory,
                main_office_transaction_entity_1.MainOfficeTransaction,
                product_entity_1.Product,
                branch_entity_1.Branch,
                branch_sale_entity_1.BranchSale,
                branch_inventory_entity_1.BranchInventory,
                customer_entity_1.Customer,
                supplier_entity_1.Supplier,
                branch_expense_entity_1.BranchExpense,
                branch_daily_revenue_entity_1.BranchDailyRevenue,
            ]),
        ],
        controllers: [main_office_controller_1.MainOfficeController],
        providers: [main_office_service_1.MainOfficeService],
    })
], MainOfficeModule);
//# sourceMappingURL=main-office.module.js.map