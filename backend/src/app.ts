import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import apiRouter from './routes';

/**
 * Aplicación Express sin arrancar el servidor ni conectar la base de datos, para poder
 * probarla con Supertest. El arranque real vive en server.ts.
 */
const app = express();

app.use(express.json());
app.use('/api', apiRouter);
app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
