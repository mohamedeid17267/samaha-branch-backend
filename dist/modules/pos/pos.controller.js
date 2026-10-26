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
exports.PosController = void 0;
const common_1 = require("@nestjs/common");
const pos_service_1 = require("./pos.service");
const create_sale_dto_1 = require("./dto/create-sale.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const branch_scope_guard_1 = require("../../common/guards/branch-scope.guard");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const user_entity_1 = require("../../database/entities/user.entity");
let PosController = class PosController {
    posService;
    constructor(posService) {
        this.posService = posService;
    }
    async createSale(createSaleDto, user, idempotencyKeyHeader) {
        if (idempotencyKeyHeader && !createSaleDto.idempotencyKey) {
            createSaleDto.idempotencyKey = idempotencyKeyHeader;
        }
        return this.posService.createSale(createSaleDto, user.username);
    }
    async returnSale(returnDto, user) {
        return this.posService.processSaleReturn(returnDto, user.username);
    }
    async syncBatch(batchData, user) {
        return this.posService.syncBatch(batchData, user?.username || 'SyncAgent');
    }
    async getSales(branchId, page, limit, startDate, endDate) {
        return this.posService.getSales(branchId ? Number(branchId) : undefined, page ? Number(page) : 1, limit ? Number(limit) : 200, startDate, endDate);
    }
    async getTreasuryReport(branchId, startDate, endDate) {
        return this.posService.getTreasuryReport(branchId ? Number(branchId) : 1, startDate, endDate);
    }
};
exports.PosController = PosController;
__decorate([
    (0, common_1.Post)('sales'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sale_dto_1.CreateSaleDto,
        user_entity_1.User, String]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "createSale", null);
__decorate([
    (0, common_1.Post)('sales/return'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "returnSale", null);
__decorate([
    (0, common_1.Post)('sync-batch'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "syncBatch", null);
__decorate([
    (0, common_1.Get)('sales'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "getSales", null);
__decorate([
    (0, common_1.Get)('treasury-report'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "getTreasuryReport", null);
exports.PosController = PosController = __decorate([
    (0, common_1.Controller)('pos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [pos_service_1.PosService])
], PosController);
//# sourceMappingURL=pos.controller.js.map