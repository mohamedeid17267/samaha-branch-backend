import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const syncSecret = req.headers['x-sync-secret'];
    const offlineSource = req.headers['x-offline-source'];

    // Allow authenticated sync requests from Slasel POS desktop app
    if (
      offlineSource === 'SLASLE_DESKTOP_POS' &&
      syncSecret === (process.env.JWT_SECRET || 'samaha-branch-secret-key-2026')
    ) {
      req.user = {
        id: 1,
        username: 'samaha',
        branchId: 1,
        role: { id: 4, name: 'Branch_Manager' },
        roles: ['BRANCH_MANAGER'],
        permissions: ['all'],
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
