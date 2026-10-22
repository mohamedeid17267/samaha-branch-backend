import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // In-memory cache for validated user sessions (reduces 400ms-800ms DB overhead per request)
  private readonly userCache = new Map<number, { user: User; expiresAt: number }>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super-secret-franchise-erp-key-2026-hq',
      ),
    });
  }

  async validate(payload: { sub: number; username: string }) {
    const now = Date.now();
    const cached = this.userCache.get(payload.sub);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { role: true, branch: true },
    });

    if (!user) {
      throw new UnauthorizedException('Session user no longer exists');
    }

    // Cache valid user session for 60 seconds
    this.userCache.set(payload.sub, { user, expiresAt: now + 60_000 });

    return user; // Attached to request.user
  }
}
