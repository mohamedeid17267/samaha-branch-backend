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
exports.SyncReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const ingest_branch_report_dto_1 = require("./dto/ingest-branch-report.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
let SyncReportsController = class SyncReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async ingestReport(dto, branchKey) {
        return this.reportsService.ingestBranchReport(dto);
    }
    async getUnifiedReports(startDate, endDate, branchCode) {
        return this.reportsService.getUnifiedBranchReports(startDate, endDate, branchCode);
    }
};
exports.SyncReportsController = SyncReportsController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-branch-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ingest_branch_report_dto_1.IngestBranchReportDto, String]),
    __metadata("design:returntype", Promise)
], SyncReportsController.prototype, "ingestReport", null);
__decorate([
    (0, common_1.Get)('unified'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleEnum.HQ_ADMIN, role_enum_1.RoleEnum.HQ_STAFF),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('branchCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SyncReportsController.prototype, "getUnifiedReports", null);
exports.SyncReportsController = SyncReportsController = __decorate([
    (0, common_1.Controller)('sync/reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], SyncReportsController);
//# sourceMappingURL=sync-reports.controller.js.map