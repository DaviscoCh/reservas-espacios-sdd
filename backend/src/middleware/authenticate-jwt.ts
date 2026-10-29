import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env';
import type { UserRole } from '../models/user.model';
import { USER_ROLES } from '../models/user.model';
import { HttpError } from '../utils/http-error';

export interface AuthUser {
  id: string;
  role: UserRole;
}

/** Devuelve el usuario autenticado que dejó `authenticateJwt` en la respuesta. */
export function getAuthUser(res: Response): AuthUser {
  const user = res.locals['authUser'] as AuthUser | undefined;
  if (!user) {
    throw HttpError.unauthorized();
  }
  return user;
}

/** Emite un JWT con identidad mínima: `sub` (id), `role` y `exp`. */
export function signToken(user: AuthUser): string {
  const { jwtSecret, jwtExpiresIn } = getConfig();
  const options: jwt.SignOptions = {
    subject: user.id,
    expiresIn: jwtExpiresIn as NonNullable<jwt.SignOptions['expiresIn']>,
  };
  return jwt.sign({ role: user.role }, jwtSecret, options);
}

/** Exige `Authorization: Bearer <jwt>` válido; responde 401 si falta o es inválido. */
export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(HttpError.unauthorized('Falta el token de autenticación'));
    return;
  }

  try {
    const payload = jwt.verify(header.slice('Bearer '.length).trim(), getConfig().jwtSecret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('Payload inválido');
    }
    const role = payload['role'] as UserRole;
    if (!USER_ROLES.includes(role)) {
      throw new Error('Rol inválido');
    }
    res.locals['authUser'] = { id: payload.sub, role } satisfies AuthUser;
    next();
  } catch {
    next(HttpError.unauthorized('El token es inválido o expiró'));
  }
}
