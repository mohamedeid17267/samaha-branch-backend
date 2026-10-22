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
exports.MainOfficeController = void 0;
const common_1 = require("@nestjs/common");
const main_office_service_1 = require("./main-office.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const user_entity_1 = require("../../database/entities/user.entity");
let MainOfficeController = class MainOfficeController {
    service;
    constructor(service) {
        this.service = service;
    }
    getExpenses() {
        return this.service.getExpenses();
    }
    addExpense(data, user) {
        return this.service.addExpense(data, user.username);
    }
    deleteExpense(id) {
        return this.service.deleteExpense(id);
    }
    getContainers() {
        return this.service.getContainers();
    }
    addContainer(data) {
        return this.service.addContainer(data);
    }
    deleteContainer(id) {
        return this.service.deleteContainer(id);
    }
    getInventory(containerId) {
        return this.service.getInventory(containerId);
    }
    receiveGoods(data) {
        return this.service.receiveGoods(data.containerId, data.productId, data.quantity, data.costPrice, data.notes);
    }
    withdrawGoods(data) {
        return this.service.withdrawGoods(data.containerId, data.productId, data.quantity, data.notes);
    }
    auditInventory(data) {
        return this.service.auditInventory(data.containerId, data.productId, data.actualQuantity, data.notes);
    }
    getTransactions() {
        return this.service.getTransactions();
    }
    getBranchesOverview() {
        return this.service.getBranchesOverview();
    }
    getBranchDeepDive(id) {
        return this.service.getBranchDeepDive(Number(id));
    }
};
exports.MainOfficeController = MainOfficeController;
__decorate([
    (0, common_1.Get)('expenses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getExpenses", null);
__decorate([
    (0, common_1.Post)('expenses'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "addExpense", null);
__decorate([
    (0, common_1.Delete)('expenses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "deleteExpense", null);
__decorate([
    (0, common_1.Get)('containers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getContainers", null);
__decorate([
    (0, common_1.Post)('containers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "addContainer", null);
__decorate([
    (0, common_1.Delete)('containers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "deleteContainer", null);
__decorate([
    (0, common_1.Get)('inventory'),
    __param(0, (0, common_1.Query)('containerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getInventory", null);
__decorate([
    (0, common_1.Post)('inventory/receive'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "receiveGoods", null);
__decorate([
    (0, common_1.Post)('inventory/withdraw'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "withdrawGoods", null);
__decorate([
    (0, common_1.Post)('inventory/audit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "auditInventory", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('branches-overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getBranchesOverview", null);
__decorate([
    (0, common_1.Get)('branches/:id/deep-dive'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MainOfficeController.prototype, "getBranchDeepDive", null);
exports.MainOfficeController = MainOfficeController = __decorate([
    (0, common_1.Controller)('main-office'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __metadata("design:paramtypes", [main_office_service_1.MainOfficeService])
], MainOfficeController);
//# sourceMappingURL=main-office.controller.js.map