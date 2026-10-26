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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_stock_dto_1 = require("./dto/update-stock.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const branch_scope_guard_1 = require("../../common/guards/branch-scope.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const user_entity_1 = require("../../database/entities/user.entity");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async create(createProductDto) {
        return this.productsService.create(createProductDto);
    }
    async createLocal(createProductDto, explicitBranchId, user) {
        const targetBranchId = Number(user?.branchId) || Number(explicitBranchId) || 3;
        return this.productsService.createLocal(createProductDto, targetBranchId);
    }
    async importCsv(csvText, user) {
        return this.productsService.importCsv(csvText, user.username);
    }
    async findAll(page, limit, search) {
        return this.productsService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 10, search);
    }
    async findOne(id) {
        return this.productsService.findOne(id);
    }
    async update(id, updateProductDto, user) {
        return this.productsService.update(id, updateProductDto, user?.username || 'Admin');
    }
    async remove(id) {
        return this.productsService.remove(id);
    }
    async updateGlobalStock(id, updateStockDto) {
        return this.productsService.updateGlobalStock(id, updateStockDto.quantity);
    }
    async getBranchInventory(branchId, page, limit, search) {
        return this.productsService.getBranchInventory(branchId, page ? Number(page) : 1, limit ? Number(limit) : 100, search);
    }
    async recordSale(branchId, productId, quantity, sellingPrice, user) {
        return this.productsService.recordSale(branchId, productId, quantity, Number(sellingPrice), user.username);
    }
    async recordWaste(branchId, productId, quantity, reason, user) {
        return this.productsService.recordWaste(branchId, productId, quantity, reason, user.username);
    }
    async updateSellingPrice(branchId, productId, user, sellingPrice, retailPrice, wholesalePrice, websitePrice, costPrice) {
        return this.productsService.updateSellingPrice(branchId, productId, sellingPrice !== undefined ? Number(sellingPrice) : undefined, user.username, {
            retailPrice: retailPrice !== undefined ? Number(retailPrice) : undefined,
            wholesalePrice: wholesalePrice !== undefined ? Number(wholesalePrice) : undefined,
            websitePrice: websitePrice !== undefined ? Number(websitePrice) : undefined,
            costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
        });
    }
    async updateBranchProduct(branchId, productId, user, updateDto) {
        return this.productsService.updateBranchProduct(branchId, productId, updateDto, user?.username || 'Branch User');
    }
    async stockIn(branchId, sku, barcode, quantity, sessionId, user) {
        const code = sku || barcode;
        return this.productsService.stockIn(branchId, code, quantity ? Number(quantity) : 1, user.username, sessionId);
    }
    async findByCode(branchId, code) {
        return this.productsService.findByBarcodeOrSku(branchId, code);
    }
    async getProductStockMovements(id, branchId, limit) {
        return this.productsService.getProductStockMovements(id, branchId ? Number(branchId) : undefined, limit ? Number(limit) : 100);
    }
    async adjustStock(id, branchId, newQuantity, reason, user) {
        return this.productsService.adjustStock(Number(branchId), id, Number(newQuantity), reason, user?.username || 'System');
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('local'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Body)('branchId')),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto, Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createLocal", null);
__decorate([
    (0, common_1.Post)('import-csv'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Body)('csvText')),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "importCsv", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.SUPER_ADMIN, role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF, role_enum_1.RoleEnum.BRANCH_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/stock'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_stock_dto_1.UpdateStockDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateGlobalStock", null);
__decorate([
    (0, common_1.Get)('branch/:branchId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getBranchInventory", null);
__decorate([
    (0, common_1.Post)('branch/:branchId/sale'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('productId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)('quantity', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)('sellingPrice')),
    __param(4, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "recordSale", null);
__decorate([
    (0, common_1.Post)('branch/:branchId/waste'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('productId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)('quantity', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)('reason')),
    __param(4, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "recordWaste", null);
__decorate([
    (0, common_1.Patch)('branch/:branchId/inventory/:productId/price'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('productId', common_1.ParseIntPipe)),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __param(3, (0, common_1.Body)('sellingPrice')),
    __param(4, (0, common_1.Body)('retailPrice')),
    __param(5, (0, common_1.Body)('wholesalePrice')),
    __param(6, (0, common_1.Body)('websitePrice')),
    __param(7, (0, common_1.Body)('costPrice')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, user_entity_1.User, Number, Number, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateSellingPrice", null);
__decorate([
    (0, common_1.Patch)('branch/:branchId/product/:productId'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('productId', common_1.ParseIntPipe)),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateBranchProduct", null);
__decorate([
    (0, common_1.Post)('branch/:branchId/stock-in'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('sku')),
    __param(2, (0, common_1.Body)('barcode')),
    __param(3, (0, common_1.Body)('quantity')),
    __param(4, (0, common_1.Body)('sessionId')),
    __param(5, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Number, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "stockIn", null);
__decorate([
    (0, common_1.Get)('branch/:branchId/by-code/:code'),
    (0, common_1.UseGuards)(branch_scope_guard_1.BranchScopeGuard),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByCode", null);
__decorate([
    (0, common_1.Get)(':id/movements'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductStockMovements", null);
__decorate([
    (0, common_1.Post)(':id/adjust-stock'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('branchId')),
    __param(2, (0, common_1.Body)('newQuantity')),
    __param(3, (0, common_1.Body)('reason')),
    __param(4, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "adjustStock", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map