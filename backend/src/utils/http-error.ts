export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** Error de negocio con código HTTP y código legible por el frontend. */
export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string): HttpError {
    return new HttpError(400, 'VALIDATION_ERROR', message);
  }
  static unauthorized(message = 'Credenciales o token inválidos'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'No tienes permiso para realizar esta acción'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }
}
