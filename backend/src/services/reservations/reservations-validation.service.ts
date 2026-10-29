import { Types } from 'mongoose';
import { getConfig } from '../../config/env';
import { getOperatingWindow, isValidLocalDate, isValidLocalTime, zonedDateTimeToUtc } from '../../utils/datetime';
import { HttpError } from '../../utils/http-error';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export interface ReservationRequest {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ReservationWindow {
  startAt: Date;
  endAt: Date;
}

/** Identificador de MongoDB con exactamente 24 caracteres hexadecimales. */
export function isObjectIdString(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

/** Forma canónica (minúsculas) del identificador; se usa como clave del bloqueo por espacio. */
export function canonicalObjectId(value: string): string {
  return new Types.ObjectId(value).toHexString();
}

/** Valida la forma del cuerpo de POST /api/reservations (FR-019); no consulta la base de datos. */
export function parseReservationRequest(body: unknown): ReservationRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('Debes enviar el espacio, la fecha y las horas de inicio y fin');
  }
  const { spaceId, date, startTime, endTime } = body as Record<string, unknown>;

  if (!isObjectIdString(spaceId)) {
    throw HttpError.badRequest('El espacio es obligatorio y debe ser un identificador válido');
  }
  if (typeof date !== 'string' || !isValidLocalDate(date)) {
    throw HttpError.badRequest('La fecha es obligatoria y debe tener formato YYYY-MM-DD');
  }
  if (typeof startTime !== 'string' || !isValidLocalTime(startTime)) {
    throw HttpError.badRequest('La hora de inicio es obligatoria y debe tener formato HH:mm');
  }
  if (typeof endTime !== 'string' || !isValidLocalTime(endTime)) {
    throw HttpError.badRequest('La hora de fin es obligatoria y debe tener formato HH:mm');
  }
  return { spaceId: canonicalObjectId(spaceId), date, startTime, endTime };
}

/**
 * Reglas temporales de una reserva (FR-006 y FR-009): el fin es posterior al inicio, cabe en la
 * jornada operativa de la misma fecha (07:00-22:00 por defecto) y el inicio no está en el pasado.
 * Las horas se interpretan en America/Guayaquil. Rechaza con 400 y un mensaje claro.
 */
export function validateReservationWindow(
  date: string,
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): ReservationWindow {
  const startAt = zonedDateTimeToUtc(date, startTime);
  const endAt = zonedDateTimeToUtc(date, endTime);

  if (endAt.getTime() <= startAt.getTime()) {
    throw HttpError.badRequest('La hora de fin debe ser posterior a la hora de inicio');
  }

  const { opensAt, closesAt } = getOperatingWindow(date);
  if (startAt.getTime() < opensAt.getTime() || endAt.getTime() > closesAt.getTime()) {
    const { operatingDayStart, operatingDayEnd } = getConfig();
    throw HttpError.badRequest(`La reserva debe estar dentro de la jornada de ${operatingDayStart} a ${operatingDayEnd}`);
  }

  if (startAt.getTime() < now.getTime()) {
    throw HttpError.badRequest('La hora de inicio no puede estar en el pasado');
  }
  return { startAt, endAt };
}
