import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate-jwt';
import { getProfile, login, parseLoginInput } from '../services/auth/auth.service';

/** POST /api/auth/login → 200 { token, user }. */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = parseLoginInput(req.body);
  res.status(200).json(await login(input));
}

/** GET /api/auth/me → 200 { id, email, role } de la cuenta autenticada. */
export async function meHandler(_req: Request, res: Response): Promise<void> {
  const { id } = getAuthUser(res);
  res.status(200).json(await getProfile(id));
}
