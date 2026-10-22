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
exports.WebsiteSyncController = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
let WebsiteSyncController = class WebsiteSyncController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async lookup(code, branchId, secret) {
        const expectedSecret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';
        if (secret && secret !== expectedSecret) {
            throw new common_1.UnauthorizedException('Invalid sync secret');
        }
        const bId = branchId ? Number(branchId) : 1;
        return this.productsService.syncLookup(code, bId);
    }
    async catalog(branchId, secret) {
        const expectedSecret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';
        if (secret && secret !== expectedSecret) {
            throw new common_1.UnauthorizedException('Invalid sync secret');
        }
        const bId = branchId ? Number(branchId) : 1;
        return this.productsService.syncCatalog(bId);
    }
};
exports.WebsiteSyncController = WebsiteSyncController;
__decorate([
    (0, common_1.Get)('lookup/:code'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Headers)('x-sync-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WebsiteSyncController.prototype, "lookup", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Headers)('x-sync-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WebsiteSyncController.prototype, "catalog", null);
exports.WebsiteSyncController = WebsiteSyncController = __decorate([
    (0, common_1.Controller)('products/sync'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], WebsiteSyncController);
//# sourceMappingURL=website-sync.controller.js.map