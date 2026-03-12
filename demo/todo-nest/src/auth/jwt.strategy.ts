import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.authService.validatePayload(payload);
    if (!user) {
      throw new UnauthorizedException('Token 无效或已过期');
    }
    return user;
  }
}
