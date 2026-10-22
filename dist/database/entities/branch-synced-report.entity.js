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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchSyncedReport = void 0;
const typeorm_1 = require("typeorm");
let BranchSyncedReport = class BranchSyncedReport {
    id;
    branchCode;
    branchName;
    reportDate;
    totalSales;
    totalOrders;
    cashSales;
    visaSales;
    totalExpenses;
    netProfit;
    currentStockValue;
    notes;
    rawDetails;
    syncStatus;
    createdAt;
    updatedAt;
};
exports.BranchSyncedReport = BranchSyncedReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BranchSyncedReport.prototype, "branchCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 128 }),
    __metadata("design:type", String)
], BranchSyncedReport.prototype, "branchName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], BranchSyncedReport.prototype, "reportDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "totalSales", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "totalOrders", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "cashSales", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "visaSales", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "totalExpenses", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "netProfit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], BranchSyncedReport.prototype, "currentStockValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], BranchSyncedReport.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BranchSyncedReport.prototype, "rawDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'SYNCED' }),
    __metadata("design:type", String)
], BranchSyncedReport.prototype, "syncStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BranchSyncedReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BranchSyncedReport.prototype, "updatedAt", void 0);
exports.BranchSyncedReport = BranchSyncedReport = __decorate([
    (0, typeorm_1.Entity)('branch_synced_reports'),
    (0, typeorm_1.Index)(['branchCode', 'reportDate'], { unique: true })
], BranchSyncedReport);
//# sourceMappingURL=branch-synced-report.entity.js.map