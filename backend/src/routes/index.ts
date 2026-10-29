import { Router } from 'express';
import authRouter from './auth.routes';
import reservationsRouter from './reservations.routes';
import spacesRouter from './spaces.routes';

/** Enrutador base montado en /api con los módulos de cada historia de usuario. */
const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/spaces', spacesRouter);
apiRouter.use('/reservations', reservationsRouter);

export default apiRouter;
