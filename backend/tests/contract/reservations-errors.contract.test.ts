import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/**
 * T027A (FR-010): todo rechazo de una reserva devuelve { code, message } con un motivo claro en
 * español, sin datos internos.
 */
const DATE = '2030-01-15';
const token = tokenFor('solicitante');

function expectClearError(body: Record<string, unknown>, code: string, message: RegExp): void {
  expect(Object.keys(body).sort()).toEqual(['code', 'message']);
  expect(body['code']).toBe(code);
  expect(body['message']).toEqual(expect.stringMatching(message));
  expect(String(body['message'])).not.toMatch(/undefined|stack|\bat\s.+\(|mongoose|E11000/i);
}

describe('Mensajes de rechazo de reserva: validación (400)', () => {
  const spaceId = String(new Types.ObjectId());

  it.each([
    ['fin igual al inicio', { startTime: '09:00', endTime: '09:00' }, /fin.*posterior.*inicio/i],
    ['fin anterior al inicio', { startTime: '10:00', endTime: '09:00' }, /fin.*posterior.*inicio/i],
    ['antes de la apertura', { startTime: '06:00', endTime: '08:00' }, /jornada de 07:00 a 22:00/],
    ['después del cierre', { startTime: '21:00', endTime: '23:00' }, /jornada de 07:00 a 22:00/],
    ['hora de inicio con formato inválido', { startTime: '9', endTime: '10:00' }, /inicio.*HH:mm/i],
    ['hora de fin con formato inválido', { startTime: '09:00', endTime: 'tarde' }, /fin.*HH:mm/i],
    ['fecha inválida', { date: '31/12/2030', startTime: '09:00', endTime: '10:00' }, /fecha.*YYYY-MM-DD/i],
    ['fecha pasada', { date: '2020-01-15', startTime: '09:00', endTime: '10:00' }, /pasado/i],
    ['espacio inválido', { spaceId: 'x', startTime: '09:00', endTime: '10:00' }, /espacio.*identificador/i],
  ])('%s', async (_caso, overrides, message) => {
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', bearer(token))
      .send({ spaceId, date: DATE, ...overrides });

    expect(response.status).toBe(400);
    expectClearError(response.body, 'VALIDATION_ERROR', message);
  });
});

describeWithDatabase('Mensajes de rechazo de reserva: 404 y 409 (MongoDB real)', () => {
  let spaceId: string;
  let inactiveSpaceId: string;

  function post(body: object) {
    return request(app).post('/api/reservations').set('Authorization', bearer(token)).send(body);
  }

  beforeAll(async () => {
    await connectTestDatabase('reservations-errors');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    spaceId = String((await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' }))._id);
    inactiveSpaceId = String(
      (await SpaceModel.create({ name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo', isActive: false }))._id,
    );
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  it('espacio inexistente: 404 con un mensaje claro', async () => {
    const response = await post({ spaceId: String(new Types.ObjectId()), date: DATE, startTime: '09:00', endTime: '10:00' });
    expect(response.status).toBe(404);
    expectClearError(response.body, 'NOT_FOUND', /espacio.*no existe/i);
  });

  it('espacio desactivado: 409 con un mensaje claro', async () => {
    const response = await post({ spaceId: inactiveSpaceId, date: DATE, startTime: '09:00', endTime: '10:00' });
    expect(response.status).toBe(409);
    expectClearError(response.body, 'CONFLICT', /desactivado.*no admite nuevas reservas/i);
  });

  it('solapamiento: 409 que indica el horario ocupado y pide elegir otro', async () => {
    await post({ spaceId, date: DATE, startTime: '08:00', endTime: '10:00' });
    const response = await post({ spaceId, date: DATE, startTime: '09:00', endTime: '11:00' });

    expect(response.status).toBe(409);
    expectClearError(response.body, 'CONFLICT', /ya está reservado de 08:00 a 10:00.*otro horario/i);
  });
});
