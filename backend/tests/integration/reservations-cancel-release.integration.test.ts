import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/** T030: cancelar una reserva libera el horario (FR-014) contra una instancia real de MongoDB. */
const DATE = '2030-01-15';

describeWithDatabase('La cancelación libera el horario (MongoDB real)', () => {
  const ana = tokenFor('solicitante');
  const beto = tokenFor('solicitante');
  let spaceId: string;

  const book = (token: string, startTime: string, endTime: string) =>
    request(app).post('/api/reservations').set('Authorization', bearer(token)).send({ spaceId, date: DATE, startTime, endTime });
  const cancel = (token: string, id: string) =>
    request(app).patch(`/api/reservations/${id}/cancel`).set('Authorization', bearer(token));
  const occupied = async (): Promise<string[]> => {
    const response = await request(app).get(`/api/spaces/availability?date=${DATE}`).set('Authorization', bearer(ana));
    return response.body.spaces[0].occupiedSlots.map(
      (slot: { startAt: string; endAt: string }) => `${slot.startAt.slice(11, 16)}-${slot.endAt.slice(11, 16)}`,
    );
  };

  beforeAll(async () => {
    await connectTestDatabase('reservations-cancel');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    spaceId = String((await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' }))._id);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await ReservationModel.deleteMany({});
  });

  it('tras cancelar, un horario que estaba en conflicto pasa a aceptarse', async () => {
    const first = await book(ana, '08:00', '10:00');
    expect(first.status).toBe(201);
    expect((await book(beto, '09:00', '11:00')).status).toBe(409);

    expect((await cancel(ana, first.body.id)).status).toBe(200);

    expect((await book(beto, '09:00', '11:00')).status).toBe(201);
  });

  it('el horario cancelado desaparece de la disponibilidad y queda el de la nueva reserva', async () => {
    const first = await book(ana, '08:00', '10:00');
    expect(await occupied()).toEqual(['08:00-10:00']);

    await cancel(ana, first.body.id);
    expect(await occupied()).toEqual([]);

    await book(beto, '08:00', '10:00');
    expect(await occupied()).toEqual(['08:00-10:00']);
  });

  it('la reserva cancelada sigue en el historial del usuario con estado cancelada', async () => {
    const first = await book(ana, '08:00', '10:00');
    await cancel(ana, first.body.id);

    const mine = await request(app).get('/api/reservations/me').set('Authorization', bearer(ana));
    expect(mine.body.map((reservation: { status: string }) => reservation.status)).toEqual(['cancelada']);
  });

  it('cancelar dos veces seguidas: la primera responde 200 y la segunda 409', async () => {
    const first = await book(ana, '08:00', '10:00');
    expect((await cancel(ana, first.body.id)).status).toBe(200);
    const again = await cancel(ana, first.body.id);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('CONFLICT');
  });

  it('dos cancelaciones simultáneas de la misma reserva: solo una tiene éxito', async () => {
    const first = await book(ana, '08:00', '10:00');
    const statuses = (await Promise.all([cancel(ana, first.body.id), cancel(ana, first.body.id)])).map((r) => r.status);
    expect(statuses.sort()).toEqual([200, 409]);
  });

  it('un identificador de reserva inexistente responde 404', async () => {
    expect((await cancel(ana, String(new Types.ObjectId()))).status).toBe(404);
  });
});
