import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/** T026: contrato de POST /api/reservations con los casos 201, 400, 404 y 409. */
const DATE = '2030-01-15';

function post(token: string, body: unknown) {
  return request(app).post('/api/reservations').set('Authorization', bearer(token)).send(body as object);
}

describe('Contrato POST /api/reservations: acceso y validación (400)', () => {
  const validBody = { spaceId: String(new Types.ObjectId()), date: DATE, startTime: '08:00', endTime: '10:00' };

  it('sin token responde 401', async () => {
    const response = await request(app).post('/api/reservations').send(validBody);
    expect(response.status).toBe(401);
  });

  it('el rol administrador responde 403: solo los solicitantes reservan', async () => {
    const response = await post(tokenFor('administrador'), validBody);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it.each([
    ['sin espacio', { ...validBody, spaceId: undefined }],
    ['con un espacio que no es un identificador', { ...validBody, spaceId: 'sala-norte' }],
    ['con una fecha inválida', { ...validBody, date: '2030-02-30' }],
    ['con una hora de inicio inválida', { ...validBody, startTime: '8am' }],
    ['con la hora de fin igual a la de inicio', { ...validBody, startTime: '09:00', endTime: '09:00' }],
    ['con la hora de fin anterior a la de inicio', { ...validBody, startTime: '10:00', endTime: '09:00' }],
    ['fuera de la jornada (antes de las 07:00)', { ...validBody, startTime: '06:00', endTime: '08:00' }],
    ['fuera de la jornada (después de las 22:00)', { ...validBody, startTime: '21:00', endTime: '23:00' }],
    ['en una fecha pasada', { ...validBody, date: '2020-01-15' }],
  ])('%s responde 400 con la forma común', async (_caso, body) => {
    const response = await post(tokenFor('solicitante'), body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it('sin cuerpo responde 400', async () => {
    const response = await request(app).post('/api/reservations').set('Authorization', bearer(tokenFor('solicitante')));
    expect(response.status).toBe(400);
  });
});

describeWithDatabase('Contrato POST /api/reservations: 201, 404 y 409 (MongoDB real)', () => {
  let spaceId: string;
  let inactiveSpaceId: string;
  const requesterId = String(new Types.ObjectId());
  const token = tokenFor('solicitante', requesterId);

  beforeAll(async () => {
    await connectTestDatabase('reservations-create');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    spaceId = String((await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' }))._id);
    inactiveSpaceId = String(
      (await SpaceModel.create({ name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo', isActive: false }))._id,
    );
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await ReservationModel.deleteMany({});
  });

  it('201 con la reserva activa creada y guardada a nombre del solicitante', async () => {
    const response = await post(token, { spaceId, date: DATE, startTime: '08:00', endTime: '10:00' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      spaceId,
      spaceName: 'Sala Norte',
      date: DATE,
      startAt: '2030-01-15T08:00:00-05:00',
      endAt: '2030-01-15T10:00:00-05:00',
      status: 'activa',
    });

    const saved = await ReservationModel.findById(response.body.id);
    expect(String(saved?.userId)).toBe(requesterId);
    expect(saved?.startAt.toISOString()).toBe('2030-01-15T13:00:00.000Z');
    expect(saved?.localDate).toBe(DATE);
  });

  it('404 si el espacio no existe', async () => {
    const response = await post(token, { spaceId: String(new Types.ObjectId()), date: DATE, startTime: '08:00', endTime: '10:00' });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('409 si el espacio está desactivado', async () => {
    const response = await post(token, { spaceId: inactiveSpaceId, date: DATE, startTime: '08:00', endTime: '10:00' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
    expect(await ReservationModel.countDocuments()).toBe(0);
  });

  it('409 si el intervalo se solapa con una reserva activa del mismo espacio', async () => {
    await post(token, { spaceId, date: DATE, startTime: '08:00', endTime: '10:00' });
    const response = await post(token, { spaceId, date: DATE, startTime: '09:00', endTime: '11:00' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
    expect(await ReservationModel.countDocuments()).toBe(1);
  });

  it('201 para una reserva consecutiva (la hora de fin de una es la de inicio de la otra)', async () => {
    await post(token, { spaceId, date: DATE, startTime: '08:00', endTime: '10:00' });
    const response = await post(token, { spaceId, date: DATE, startTime: '10:00', endTime: '11:00' });
    expect(response.status).toBe(201);
  });

  it('201 en otro espacio a la misma hora y en el mismo espacio otro día', async () => {
    const other = String((await SpaceModel.create({ name: 'Sala Sur', type: 'sala', capacity: 10, location: 'Edificio B' }))._id);
    await post(token, { spaceId, date: DATE, startTime: '08:00', endTime: '10:00' });

    const otherSpace = await post(token, { spaceId: other, date: DATE, startTime: '08:00', endTime: '10:00' });
    const otherDay = await post(token, { spaceId, date: '2030-01-16', startTime: '08:00', endTime: '10:00' });
    expect(otherSpace.status).toBe(201);
    expect(otherDay.status).toBe(201);
  });
});
