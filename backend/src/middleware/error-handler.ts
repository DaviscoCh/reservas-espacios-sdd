import type { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { HttpError } from '../utils/http-error';

/** Forma común de error: { code, message }. */
export interface ErrorBody {
  code: string;
  message: string;
}

/** Rutas inexistentes bajo /api responden 404 con la forma común. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound('La ruta solicitada no existe'));
}

/** Convierte cualquier error en 400/401/403/404/409 con { code, message }; lo inesperado es 500. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, message: error.message } satisfies ErrorBody);
    return;
  }

  if (error instanceof MongooseError.ValidationError || error instanceof MongooseError.CastError) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: error.message } satisfies ErrorBody);
    return;
  }

  // JSON mal formado en el cuerpo de la solicitud (lo lanza express.json()).
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es un JSON válido' } satisfies ErrorBody);
    return;
  }

  // Violación de índice único (por ejemplo, correo duplicado).
  if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000) {
    res.status(409).json({ code: 'CONFLICT', message: 'Ya existe un registro con esos datos' } satisfies ErrorBody);
    return;
  }

  console.error('Error no controlado:', error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno' } satisfies ErrorBody);
}
