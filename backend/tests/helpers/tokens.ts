import { Types } from 'mongoose';
import { signToken } from '../../src/middleware/authenticate-jwt';
import type { UserRole } from '../../src/models/user.model';

/** Emite un JWT válido sin pasar por el login (la autenticación no consulta la base de datos). */
export function tokenFor(role: UserRole, userId: string = String(new Types.ObjectId())): string {
  return signToken({ id: userId, role });
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
