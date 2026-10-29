import {
  parseReservationRequest,
  validateReservationWindow,
} from '../../src/services/reservations/reservations-validation.service';

/** T033: reglas temporales y de forma de la reserva (sin base de datos). */
const SPACE_ID = 'AAAAAAAAAAAAAAAAAAAAAAAA';
const NOW = new Date('2030-01-10T12:00:00.000Z'); // 07:00 en Guayaquil
const validBody = { spaceId: SPACE_ID, date: '2030-01-15', startTime: '08:00', endTime: '10:00' };

describe('parseReservationRequest', () => {
  it('acepta un cuerpo válido y normaliza el identificador a minúsculas', () => {
    expect(parseReservationRequest(validBody)).toEqual({ ...validBody, spaceId: SPACE_ID.toLowerCase() });
  });

  it.each([
    ['sin cuerpo', undefined],
    ['un arreglo', []],
    ['sin espacio', { ...validBody, spaceId: undefined }],
    ['con un espacio que no es un identificador', { ...validBody, spaceId: 'sala-norte' }],
    ['sin fecha', { ...validBody, date: undefined }],
    ['con una fecha inexistente', { ...validBody, date: '2030-02-30' }],
    ['con una fecha en otro formato', { ...validBody, date: '15/01/2030' }],
    ['sin hora de inicio', { ...validBody, startTime: undefined }],
    ['con una hora de inicio inválida', { ...validBody, startTime: '25:00' }],
    ['con una hora de fin sin formato HH:mm', { ...validBody, endTime: '10' }],
    ['con una hora de fin que no es texto', { ...validBody, endTime: 1000 }],
  ])('rechaza con 400 un cuerpo %s', (_caso, body) => {
    expect(() => parseReservationRequest(body)).toThrow(expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' }));
  });
});

describe('validateReservationWindow', () => {
  it('convierte las horas de Guayaquil (UTC-5) a instantes UTC', () => {
    const { startAt, endAt } = validateReservationWindow('2030-01-15', '08:00', '10:00', NOW);
    expect(startAt.toISOString()).toBe('2030-01-15T13:00:00.000Z');
    expect(endAt.toISOString()).toBe('2030-01-15T15:00:00.000Z');
  });

  it('acepta la jornada completa de 07:00 a 22:00', () => {
    expect(() => validateReservationWindow('2030-01-15', '07:00', '22:00', NOW)).not.toThrow();
  });

  it.each([
    ['la hora de fin es igual a la de inicio', '09:00', '09:00', /posterior/],
    ['la hora de fin es anterior a la de inicio', '10:00', '09:00', /posterior/],
    ['empieza antes de la apertura', '06:59', '09:00', /jornada/],
    ['termina después del cierre', '21:00', '22:01', /jornada/],
    ['cruza la medianoche', '21:00', '00:30', /posterior/],
  ])('rechaza con 400 si %s', (_caso, start, end, message) => {
    expect(() => validateReservationWindow('2030-01-15', start, end, NOW)).toThrow(
      expect.objectContaining({ status: 400, message: expect.stringMatching(message) }),
    );
  });

  it('rechaza una hora de inicio en el pasado y acepta exactamente el instante actual', () => {
    expect(() => validateReservationWindow('2030-01-10', '08:00', '09:00', new Date('2030-01-10T13:30:00.000Z'))).toThrow(
      expect.objectContaining({ status: 400, message: expect.stringMatching(/pasado/) }),
    );
    expect(() => validateReservationWindow('2030-01-10', '08:00', '09:00', new Date('2030-01-10T13:00:00.000Z'))).not.toThrow();
  });

  it('rechaza una fecha de un día anterior', () => {
    expect(() => validateReservationWindow('2030-01-09', '08:00', '09:00', NOW)).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });
});
