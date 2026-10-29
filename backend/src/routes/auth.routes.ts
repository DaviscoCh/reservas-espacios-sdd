import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/authenticate-jwt';

/** Rutas de autenticación (historia US4): POST /login y GET /me. */
const authRouter = Router();

authRouter.post('/login', loginHandler);
authRouter.get('/me', authenticateJwt, meHandler);

export default authRouter;
