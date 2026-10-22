"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchScopeGuard = void 0;
const common_1 = require("@nestjs/common");
const role_enum_1 = require("../enums/role.enum");
let BranchScopeGuard = class BranchScopeGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User session not found');
        }
        const isHqUser = user.role.name === role_enum_1.RoleEnum.SUPER_ADMIN ||
            user.role.name === role_enum_1.RoleEnum.HQ_ADMIN ||
            user.role.name === role_enum_1.RoleEnum.HQ_STAFF;
        if (isHqUser) {
            return true;
        }
        if (user.role.name === role_enum_1.RoleEnum.BRANCH_MANAGER ||
            user.role.name === role_enum_1.RoleEnum.CASHIER) {
            const userBranchId = Number(user.branchId);
            if (isNaN(userBranchId) || userBranchId === 0) {
                throw new common_1.ForbiddenException('User is not assigned to any branch');
            }
            const targetBranchId = request.params?.branchId ||
                request.query?.branchId ||
                request.body?.branchId ||
                (request.route?.path && typeof request.route.path === 'string' && request.route.path.startsWith('/branches/:')
                    ? request.params?.id
                    : null);
            if (targetBranchId !== undefined && targetBranchId !== null) {
                const parsedTargetId = Number(targetBranchId);
                if (parsedTargetId !== userBranchId) {
                    throw new common_1.ForbiddenException(`Access Denied: You are restricted to Branch ID ${userBranchId}`);
                }
            }
            else {
                if (request.params) {
                    request.params.branchId = userBranchId.toString();
                }
                if (request.query) {
                    request.query.branchId = userBranchId.toString();
                }
                if (request.body && typeof request.body === 'object') {
                    request.body.branchId = userBranchId;
                }
            }
            return true;
        }
        return false;
    }
};
exports.BranchScopeGuard = BranchScopeGuard;
exports.BranchScopeGuard = BranchScopeGuard = __decorate([
    (0, common_1.Injectable)()
], BranchScopeGuard);
//# sourceMappingURL=branch-scope.guard.js.map