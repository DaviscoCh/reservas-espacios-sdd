import {
  getLocalDate,
  getOperatingWindow,
  isValidLocalDate,
  isValidLocalTime,
  isWithinOperatingDay,
  toZonedIsoString,
  zonedDateTimeToUtc,
} from '../../src/utils/datetime';

describe('utilidades de fecha y hora operativa (America/Guayaquil, UTC-5)', () => {
  it('convierte hora local de Guayaquil a UTC', () => {
    expect(zonedDateTimeToUtc('2026-11-10', '08:00').toISOString()).toBe('2026-11-10T13:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-11-10', '22:00').toISOString()).toBe('2026-11-11T03:00:00.000Z');
  });

  it('obtiene la fecha local de un instante (cruce de medianoche UTC)', () => {
    expect(getLocalDate(new Date('2026-11-11T03:00:00.000Z'))).toBe('2026-11-10');
    expect(getLocalDate(new Date('2026-11-11T05:00:00.000Z'))).toBe('2026-11-11');
  });

  it('valida fechas y horas', () => {
    expect(isValidLocalDate('2026-11-10')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('10/11/2026')).toBe(false);
    expect(isValidLocalTime('07:00')).toBe(true);
    expect(isValidLocalTime('24:00')).toBe(false);
    expect(isValidLocalTime('7:00')).toBe(false);
  });

  it('rechaza fecha u hora inválidas al convertir', () => {
    expect(() => zonedDateTimeToUtc('2026-13-01', '08:00')).toThrow(RangeError);
  });

  it('calcula la jornada operativa 07:00-22:00', () => {
    const { opensAt, closesAt } = getOperatingWindow('2026-11-10');
    expect(opensAt.toISOString()).toBe('2026-11-10T12:00:00.000Z');
    expect(closesAt.toISOString()).toBe('2026-11-11T03:00:00.000Z');
  });

  it('acepta intervalos dentro de la jornada, incluidos los bordes', () => {
    const at = (time: string): Date => zonedDateTimeToUtc('2026-11-10', time);
    expect(isWithinOperatingDay(at('07:00'), at('09:00'))).toBe(true);
    expect(isWithinOperatingDay(at('20:00'), at('22:00'))).toBe(true);
  });

  it('rechaza intervalos que empiezan antes de abrir o terminan después de cerrar', () => {
    const at = (time: string): Date => zonedDateTimeToUtc('2026-11-10', time);
    expect(isWithinOperatingDay(at('06:30'), at('08:00'))).toBe(false);
    expect(isWithinOperatingDay(at('21:00'), at('22:30'))).toBe(false);
  });

  it('rechaza intervalos que cruzan a otra fecha operativa', () => {
    const start = zonedDateTimeToUtc('2026-11-10', '21:00');
    const end = zonedDateTimeToUtc('2026-11-11', '08:00');
    expect(isWithinOperatingDay(start, end)).toBe(false);
  });

  it('formatea un instante con el desfase -05:00', () => {
    expect(toZonedIsoString(new Date('2026-11-10T13:00:00.000Z'))).toBe('2026-11-10T08:00:00-05:00');
  });
});
