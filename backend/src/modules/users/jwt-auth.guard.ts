import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

// Protege as rotas do BaaS exigindo um JWT do user (Authorization: Bearer)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
      req.userId = payload.sub;
      req.userEmail = payload.email;
      return true;
    } catch {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado');
    }
  }
}
