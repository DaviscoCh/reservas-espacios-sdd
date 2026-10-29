import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { signToken } from '../../src/middleware/authenticate-jwt';
import { ReservationModel, type ReservationStatus } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { zonedDateTimeToUtc } from '../../src/utils/datetime';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';

/** T020: disponibilidad por fecha y por espacios activos contra una instancia real de MongoDB. */
const DATE = '2026-11-10';
const token = signToken({ id: String(new Types.ObjectId()), role: 'solicitante' });

async function reserve(
  spaceId: unknown,
  date: string,
  from: string,
  to: string,
  status: ReservationStatus = 'activa',
): Promise<void> {
  await ReservationModel.create({
    userId: new Types.ObjectId(),
    spaceId,
    localDate: date,
    startAt: zonedDateTimeToUtc(date, from),
    endAt: zonedDateTimeToUtc(date, to),
    status,
  });
}

async function availability(date: string) {
  return request(app).get(`/api/spaces/availability?date=${date}`).set('Authorization', `Bearer ${token}`);
}

describeWithDatabase('Disponibilidad de espacios (MongoDB real)', () => {
  beforeAll(async () => {
    await connectTestDatabase('availability-integration');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await Promise.all([SpaceModel.deleteMany({}), ReservationModel.deleteMany({})]);
  });

  it('sin espacios registrados devuelve una lista vacía', async () => {
    const response = await availability(DATE);
    expect(response.status).toBe(200);
    expect(response.body.spaces).toEqual([]);
  });

  it('solo lista los espacios activos', async () => {
    await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    await SpaceModel.create({ name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo', isActive: false });

    const response = await availability(DATE);
    expect(response.body.spaces.map((space: { name: string }) => space.name)).toEqual(['Sala Norte']);
  });

  it('un espacio sin reservas aparece con occupiedSlots vacío y los espacios salen ordenados por nombre', async () => {
    await SpaceModel.create({ name: 'Sala Sur', type: 'sala', capacity: 10, location: 'Edificio B' });
    await SpaceModel.create({ name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo' });

    const response = await availability(DATE);
    expect(response.body.spaces.map((space: { name: string }) => space.name)).toEqual(['Cancha 1', 'Sala Sur']);
    expect(response.body.spaces.every((space: { occupiedSlots: unknown[] }) => space.occupiedSlots.length === 0)).toBe(true);
  });

  it('excluye las reservas canceladas porque liberan el horario', async () => {
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    await reserve(space._id, DATE, '08:00', '10:00', 'cancelada');
    await reserve(space._id, DATE, '10:00', '11:00');

    const response = await availability(DATE);
    expect(response.body.spaces[0].occupiedSlots).toEqual([
      { startAt: '2026-11-10T10:00:00-05:00', endAt: '2026-11-10T11:00:00-05:00' },
    ]);
  });

  it('solo incluye las reservas de la fecha consultada', async () => {
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    await reserve(space._id, '2026-11-09', '08:00', '10:00');
    await reserve(space._id, DATE, '14:00', '15:00');
    await reserve(space._id, '2026-11-11', '08:00', '10:00');

    const response = await availability(DATE);
    expect(response.body.spaces[0].occupiedSlots).toHaveLength(1);
    expect(response.body.spaces[0].occupiedSlots[0].startAt).toBe('2026-11-10T14:00:00-05:00');
  });

  it('ordena los horarios ocupados por hora de inicio', async () => {
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    await reserve(space._id, DATE, '15:00', '16:00');
    await reserve(space._id, DATE, '08:00', '09:00');
    await reserve(space._id, DATE, '11:00', '12:00');

    const response = await availability(DATE);
    const starts = response.body.spaces[0].occupiedSlots.map((slot: { startAt: string }) => slot.startAt.slice(11, 16));
    expect(starts).toEqual(['08:00', '11:00', '15:00']);
  });

  it('no mezcla las reservas de un espacio con las de otro', async () => {
    const north = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    const south = await SpaceModel.create({ name: 'Sala Sur', type: 'sala', capacity: 10, location: 'Edificio B' });
    await reserve(north._id, DATE, '08:00', '10:00');
    await reserve(south._id, DATE, '09:00', '11:00');

    const response = await availability(DATE);
    const byName = Object.fromEntries(
      response.body.spaces.map((space: { name: string; occupiedSlots: { startAt: string }[] }) => [
        space.name,
        space.occupiedSlots.map((slot) => slot.startAt.slice(11, 16)),
      ]),
    );
    expect(byName).toEqual({ 'Sala Norte': ['08:00'], 'Sala Sur': ['09:00'] });
  });

  it('una reserva de 21:00 a 22:00 hora de Guayaquil (ya es el día siguiente en UTC) aparece en su fecha local', async () => {
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    await reserve(space._id, DATE, '21:00', '22:00');

    const response = await availability(DATE);
    expect(response.body.spaces[0].occupiedSlots).toEqual([
      { startAt: '2026-11-10T21:00:00-05:00', endAt: '2026-11-10T22:00:00-05:00' },
    ]);
    const nextDay = await availability('2026-11-11');
    expect(nextDay.body.spaces[0].occupiedSlots).toEqual([]);
  });
});
