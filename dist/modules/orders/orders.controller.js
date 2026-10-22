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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const branch_scope_guard_1 = require("../../common/guards/branch-scope.guard");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const user_entity_1 = require("../../database/entities/user.entity");
const order_status_enum_1 = require("../../common/enums/order-status.enum");
const role_enum_1 = require("../../common/enums/role.enum");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let OrdersController = class OrdersController {
    ordersService;
    async deleteOrder(id, req) {
        await this.ordersService.deleteOrder(+id, req.user.username);
        return { message: 'Deleted successfully' };
    }
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async create(createOrderDto, user) {
        return this.ordersService.create(createOrderDto, user.username);
    }
    async createHqInvoice(createOrderDto, user) {
        if (user.role.name === role_enum_1.RoleEnum.BRANCH_MANAGER) {
            throw new common_1.ForbiddenException('Access Denied: Branch Managers cannot issue invoices directly');
        }
        return this.ordersService.createInvoiceFromHq(createOrderDto, user.username);
    }
    async findAll(branchId, status, page, limit, customerId, targetType) {
        return this.ordersService.findAll(branchId ? Number(branchId) : undefined, status, page ? Number(page) : 1, limit ? Number(limit) : 10, customerId ? Number(customerId) : undefined, targetType);
    }
    async findOne(id, user) {
        const order = await this.ordersService.findOne(id);
        if (user.role.name === role_enum_1.RoleEnum.BRANCH_MANAGER &&
            order.branchId !== user.branchId) {
            throw new common_1.ForbiddenException('Access Denied: You cannot view orders of another branch');
        }
        return order;
    }
    async updateStatus(id, updateDto, user) {
        const order = await this.ordersService.findOne(id);
        if ((updateDto.status === order_status_enum_1.OrderStatus.APPROVED ||
            updateDto.status === order_status_enum_1.OrderStatus.SHIPPED) &&
            user.role.name === role_enum_1.RoleEnum.BRANCH_MANAGER) {
            throw new common_1.ForbiddenException('Access Denied: Branch Managers cannot approve or ship orders');
        }
        if (updateDto.status === order_status_enum_1.OrderStatus.DELIVERED) {
            if (user.role.name === role_enum_1.RoleEnum.BRANCH_MANAGER &&
                order.branchId !== user.branchId) {
                throw new common_1.ForbiddenException('Access Denied: You cannot confirm receipt for another branch');
            }
        }
        return this.ordersService.updateStatus(id, updateDto, user.username);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "deleteOrder", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('hq-invoice'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createHqInvoice", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('customerId')),
    __param(5, (0, common_1.Query)('targetType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number, Number, Number, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_order_status_dto_1.UpdateOrderStatusDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateStatus", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map