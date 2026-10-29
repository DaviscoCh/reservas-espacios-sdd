import { Router } from 'express';
import { availabilityHandler } from '../controllers/spaces.controller';
import { createSpaceHandler, listSpacesHandler, updateSpaceHandler } from '../controllers/spaces-admin.controller';
import { authenticateJwt } from '../middleware/authenticate-jwt';
import { authorizeRole } from '../middleware/authorize-role';

/** US1: disponibilidad (ambos roles). US3: listado (autenticado) y alta/edición (solo administrador). */
const spacesRouter = Router();

spacesRouter.get('/availability', authenticateJwt, authorizeRole('solicitante', 'administrador'), availabilityHandler);
spacesRouter.get('/', authenticateJwt, listSpacesHandler);
spacesRouter.post('/', authenticateJwt, authorizeRole('administrador'), createSpaceHandler);
spacesRouter.patch('/:id', authenticateJwt, authorizeRole('administrador'), updateSpaceHandler);

export default spacesRouter;
