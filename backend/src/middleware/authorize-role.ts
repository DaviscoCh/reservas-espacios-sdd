import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/user.model';
import { HttpError } from '../utils/http-error';
import { getAuthUser } from './authenticate-jwt';

/** Permite continuar solo a los roles indicados; responde 403 con otro rol. Va después de authenticateJwt. */
export function authorizeRole(...allowedRoles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const { role } = getAuthUser(res);
      if (!allowedRoles.includes(role)) {
        throw HttpError.forbidden();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
