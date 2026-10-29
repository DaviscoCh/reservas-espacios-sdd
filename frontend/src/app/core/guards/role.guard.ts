import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService, Role } from '../auth/auth-session.service';
import { homeFor } from '../auth/role-home';

/**
 * Permite el acceso solo a los roles indicados. Sin sesión envía al login; con un rol
 * distinto envía a la pantalla de inicio de su propio rol.
 */
export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return () => {
    const session = inject(AuthSessionService);
    const router = inject(Router);
    const user = session.user();

    if (!session.isAuthenticated() || !user) {
      return router.createUrlTree(['/login']);
    }
    return allowedRoles.includes(user.role) ? true : router.createUrlTree([homeFor(user.role)]);
  };
}
