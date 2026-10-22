import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User session not found');
    }

    // HQ Users can access all branches/data.
    const isHqUser =
      user.role.name === RoleEnum.SUPER_ADMIN ||
      user.role.name === RoleEnum.HQ_ADMIN ||
      user.role.name === RoleEnum.HQ_STAFF;
    if (isHqUser) {
      return true;
    }

    // Branch Managers and Cashiers can only access their specific branch
    if (
      user.role.name === RoleEnum.BRANCH_MANAGER ||
      user.role.name === RoleEnum.CASHIER
    ) {
      const userBranchId = Number(user.branchId);

      if (isNaN(userBranchId) || userBranchId === 0) {
        throw new ForbiddenException('User is not assigned to any branch');
      }

      // Check request params, query, and body for branchId or id (if scoping branch itself)
      const targetBranchId =
        request.params?.branchId ||
        request.query?.branchId ||
        request.body?.branchId ||
        (request.route?.path && typeof request.route.path === 'string' && request.route.path.startsWith('/branches/:')
          ? request.params?.id
          : null);

      if (targetBranchId !== undefined && targetBranchId !== null) {
        const parsedTargetId = Number(targetBranchId);
        if (parsedTargetId !== userBranchId) {
          throw new ForbiddenException(
            `Access Denied: You are restricted to Branch ID ${userBranchId}`,
          );
        }
      } else {
        // Automatically inject the user's branchId into the request object to enforce scoping down the line.
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
}
