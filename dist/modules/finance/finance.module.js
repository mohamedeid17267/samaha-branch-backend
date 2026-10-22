"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const finance_service_1 = require("./finance.service");
const finance_controller_1 = require("./finance.controller");
const brand_royalty_ledger_entity_1 = require("../../database/entities/brand-royalty-ledger.entity");
const inventory_debt_ledger_entity_1 = require("../../database/entities/inventory-debt-ledger.entity");
const branch_entity_1 = require("../../database/entities/branch.entity");
const liability_entity_1 = require("../../database/entities/liability.entity");
const branch_expense_entity_1 = require("../../database/entities/branch-expense.entity");
const branch_daily_revenue_entity_1 = require("../../database/entities/branch-daily-revenue.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                brand_royalty_ledger_entity_1.BrandRoyaltyLedger,
                inventory_debt_ledger_entity_1.InventoryDebtLedger,
                branch_entity_1.Branch,
                liability_entity_1.Liability,
                branch_expense_entity_1.BranchExpense,
                branch_daily_revenue_entity_1.BranchDailyRevenue,
                customer_debt_ledger_entity_1.CustomerDebtLedger
            ]),
        ],
        controllers: [finance_controller_1.FinanceController],
        providers: [finance_service_1.FinanceService],
        exports: [finance_service_1.FinanceService],
    })
], FinanceModule);
//# sourceMappingURL=finance.module.js.map