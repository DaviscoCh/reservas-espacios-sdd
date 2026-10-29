import { Router } from 'express';
import {
  cancelReservationHandler,
  createReservationHandler,
  myReservationsHandler,
} from '../controllers/reservations.controller';
import { authenticateJwt } from '../middleware/authenticate-jwt';
import { authorizeRole } from '../middleware/authorize-role';

/** Historia US2: las tres operaciones son exclusivas del rol solicitante. */
const reservationsRouter = Router();

reservationsRouter.use(authenticateJwt, authorizeRole('solicitante'));
reservationsRouter.post('/', createReservationHandler);
reservationsRouter.get('/me', myReservationsHandler);
reservationsRouter.patch('/:id/cancel', cancelReservationHandler);

export default reservationsRouter;
