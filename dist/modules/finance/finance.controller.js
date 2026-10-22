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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const record_charge_dto_1 = require("./dto/record-charge.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const branch_scope_guard_1 = require("../../common/guards/branch-scope.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const user_entity_1 = require("../../database/entities/user.entity");
let FinanceController = class FinanceController {
    financeService;
    async deletePayment(ledgerType, id, req) {
        await this.financeService.deletePayment(ledgerType, +id, req.user.username);
        return { message: 'Deleted successfully' };
    }
    async updatePayment(ledgerType, id, body, req) {
        await this.financeService.updatePayment(ledgerType, +id, body, req.user.username);
        return { message: 'Updated successfully' };
    }
    constructor(financeService) {
        this.financeService = financeService;
    }
    async recordPayment(paymentDto, user) {
        return this.financeService.recordPayment(paymentDto, user.username);
    }
    async recordRoyaltyCharge(chargeDto, user) {
        return this.financeService.recordRoyaltyCharge(chargeDto, user.username);
    }
    async getRoyaltyLedger(branchId, page, limit) {
        return this.financeService.getRoyaltyLedger(branchId, page ? Number(page) : 1, limit ? Number(limit) : 10);
    }
    async getInventoryDebtLedger(branchId, page, limit) {
        return this.financeService.getInventoryDebtLedger(branchId, page ? Number(page) : 1, limit ? Number(limit) : 10);
    }
    async getAllBranchFinancialSummaries() {
        return this.financeService.getAllBranchFinancialSummaries();
    }
    async getAllPayments() {
        return this.financeService.getAllPayments();
    }
    async getBranchFinancialSummary(branchId) {
        return this.financeService.getBranchFinancialSummary(branchId);
    }
    async getLiabilities() {
        return this.financeService.getLiabilities();
    }
    async addLiability(data, user) {
        return this.financeService.addLiability(data, user.username);
    }
    async updateLiability(id, data) {
        return this.financeService.updateLiability(id, data);
    }
    async deleteLiability(id) {
        return this.financeService.deleteLiability(id);
    }
    async getAllBranchExpenses() {
        return this.financeService.getBranchExpenses();
    }
    async getBranchExpenses(branchId) {
        return this.financeService.getBranchExpenses(branchId);
    }
    async addBranchExpense(branchId, data) {
        return this.financeService.addBranchExpense(branchId, data);
    }
    async getAllBranchDailyRevenues() {
        return this.financeService.getBranchDailyRevenues();
    }
    async getBranchDailyRevenues(branchId) {
        return this.financeService.getBranchDailyRevenues(branchId);
    }
    async addBranchDailyRevenue(branchId, data) {
        return this.financeService.addBranchDailyRevenue(branchId, data);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Delete)('payments/:ledgerType/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Param)('ledgerType')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deletePayment", null);
__decorate([
    (0, common_1.Patch)('payments/:ledgerType/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Param)('ledgerType')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updatePayment", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_payment_dto_1.RecordPaymentDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)('royalty/charge'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_charge_dto_1.RecordChargeDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordRoyaltyCharge", null);
__decorate([
    (0, common_1.Get)('royalty/ledger/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getRoyaltyLedger", null);
__decorate([
    (0, common_1.Get)('inventory-debt/ledger/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getInventoryDebtLedger", null);
__decorate([
    (0, common_1.Get)('summaries'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAllBranchFinancialSummaries", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAllPayments", null);
__decorate([
    (0, common_1.Get)('summary/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getBranchFinancialSummary", null);
__decorate([
    (0, common_1.Get)('liabilities'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getLiabilities", null);
__decorate([
    (0, common_1.Post)('liabilities'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "addLiability", null);
__decorate([
    (0, common_1.Post)('liabilities/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateLiability", null);
__decorate([
    (0, common_1.Post)('liabilities/:id/delete'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteLiability", null);
__decorate([
    (0, common_1.Get)('branch-expenses'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAllBranchExpenses", null);
__decorate([
    (0, common_1.Get)('branch-expenses/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getBranchExpenses", null);
__decorate([
    (0, common_1.Post)('branch-expenses/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "addBranchExpense", null);
__decorate([
    (0, common_1.Get)('branch-revenues'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAllBranchDailyRevenues", null);
__decorate([
    (0, common_1.Get)('branch-revenues/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getBranchDailyRevenues", null);
__decorate([
    (0, common_1.Post)('branch-revenues/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "addBranchDailyRevenue", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map