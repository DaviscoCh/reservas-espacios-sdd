import { Router } from 'express';
import { availabilityHandler } from '../controllers/spaces.controller';
import { authenticateJwt } from '../middleware/authenticate-jwt';
import { authorizeRole } from '../middleware/authorize-role';

// US1: disponibilidad. La administración de espacios (POST y PATCH) se agrega en US3.
const spacesRouter = Router();

spacesRouter.get('/availability', authenticateJwt, authorizeRole('solicitante', 'administrador'), availabilityHandler);

export default spacesRouter;
