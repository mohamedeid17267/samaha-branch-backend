import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class BranchScopeGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
