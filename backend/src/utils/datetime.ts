import { getConfig } from '../config/env';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Valida una fecha calendario con formato YYYY-MM-DD (rechaza 2026-02-30). */
export function isValidLocalDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Valida una hora con formato HH:mm de 24 horas. */
export function isValidLocalTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Diferencia (en ms) entre la hora local de la zona y UTC para un instante dado. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convierte una fecha y hora locales de la zona operativa (por defecto America/Guayaquil)
 * en el instante UTC correspondiente.
 */
export function zonedDateTimeToUtc(localDate: string, localTime: string, timeZone: string = getConfig().timezone): Date {
  if (!isValidLocalDate(localDate) || !isValidLocalTime(localTime)) {
    throw new RangeError(`Fecha u hora inválida: ${localDate} ${localTime}`);
  }
  const [year, month, day] = localDate.split('-').map(Number) as [number, number, number];
  const [hour, minute] = localTime.split(':').map(Number) as [number, number];
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Dos pasadas cubren cambios de horario (Ecuador continental no usa horario de verano).
  const firstGuess = naiveUtc - zoneOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

/** Fecha local (YYYY-MM-DD) de un instante en la zona operativa. */
export function getLocalDate(instant: Date, timeZone: string = getConfig().timezone): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const read = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/** Inicio y fin de la jornada operativa (07:00-22:00 por defecto) para una fecha local. */
export function getOperatingWindow(localDate: string): { opensAt: Date; closesAt: Date } {
  const config = getConfig();
  return {
    opensAt: zonedDateTimeToUtc(localDate, config.operatingDayStart, config.timezone),
    closesAt: zonedDateTimeToUtc(localDate, config.operatingDayEnd, config.timezone),
  };
}

/**
 * Indica si el intervalo [startAt, endAt] cabe dentro de la jornada operativa de la fecha
 * local de `startAt`. Como la jornada termina antes de medianoche, un fin dentro de la jornada
 * implica además que inicio y fin pertenecen a la misma fecha operativa.
 */
export function isWithinOperatingDay(startAt: Date, endAt: Date): boolean {
  const localDate = getLocalDate(startAt, getConfig().timezone);
  const { opensAt, closesAt } = getOperatingWindow(localDate);
  return startAt >= opensAt && endAt <= closesAt;
}

/** Formatea un instante como ISO 8601 con el desfase de la zona operativa (ej. 2026-11-10T08:00:00-05:00). */
export function toZonedIsoString(instant: Date, timeZone: string = getConfig().timezone): string {
  const offsetMinutes = Math.round(zoneOffsetMs(instant, timeZone) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  const local = new Date(instant.getTime() + offsetMinutes * 60000).toISOString().slice(0, 19);
  return `${local}${offset}`;
}
