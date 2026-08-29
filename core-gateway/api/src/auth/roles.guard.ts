import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assuming user is injected by an AuthGuard

    // If user is not present (e.g. no AuthGuard before this), deny access
    if (!user || !user.roles) {
      // In a real implementation we would throw UnauthorizedException
      // For now, let's mock it for the sake of the skeleton
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
