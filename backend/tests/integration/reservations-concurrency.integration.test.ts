import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { intervalsOverlap } from '../../src/services/reservations/overlap';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/**
 * T029: solicitudes simultáneas al mismo spaceId contra una instancia real de MongoDB.
 * Todas llegan a la misma instancia del servidor, que es el caso que cubre el bloqueo en memoria.
 */
const DATE = '2030-01-15';

describeWithDatabase('Concurrencia en la creación de reservas (MongoDB real)', () => {
  let spaceId: string;
  let otherSpaceId: string;

  function book(spaceIdValue: string, startTime: string, endTime: string): Promise<number> {
    return request(app)
      .post('/api/reservations')
      .set('Authorization', bearer(tokenFor('solicitante')))
      .send({ spaceId: spaceIdValue, date: DATE, startTime, endTime })
      .then((response) => response.status);
  }

  beforeAll(async () => {
    await connectTestDatabase('reservations-concurrency');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    spaceId = String((await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' }))._id);
    otherSpaceId = String((await SpaceModel.create({ name: 'Sala Sur', type: 'sala', capacity: 10, location: 'Edificio B' }))._id);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await ReservationModel.deleteMany({});
  });

  it('5 solicitudes simultáneas al mismo espacio y horario: solo una recibe 201 y las otras 4 reciben 409', async () => {
    const statuses = await Promise.all(Array.from({ length: 5 }, () => book(spaceId, '08:00', '10:00')));

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(4);
    expect(await ReservationModel.countDocuments({ status: 'activa' })).toBe(1);
  });

  it('solicitudes simultáneas con horarios que se cruzan: solo una se crea', async () => {
    const statuses = await Promise.all([
      book(spaceId, '08:00', '10:00'),
      book(spaceId, '09:00', '11:00'),
      book(spaceId, '09:30', '10:30'),
      book(spaceId, '07:00', '12:00'),
    ]);

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(await ReservationModel.countDocuments({ status: 'activa' })).toBe(1);
  });

  it('solicitudes simultáneas consecutivas (fin == inicio) se crean todas', async () => {
    const statuses = await Promise.all([
      book(spaceId, '08:00', '09:00'),
      book(spaceId, '09:00', '10:00'),
      book(spaceId, '10:00', '11:00'),
    ]);

    expect(statuses).toEqual([201, 201, 201]);
    expect(await ReservationModel.countDocuments({ status: 'activa' })).toBe(3);
  });

  it('el bloqueo es por espacio: el mismo horario en dos espacios distintos se crea en ambos', async () => {
    const statuses = await Promise.all([book(spaceId, '08:00', '10:00'), book(otherSpaceId, '08:00', '10:00')]);
    expect(statuses).toEqual([201, 201]);
  });

  it('ráfaga de 12 solicitudes con muchos cruces: nunca quedan dos reservas activas solapadas', async () => {
    const toTime = (minutes: number): string =>
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    // Inicios cada 30 minutos entre 08:00 y 13:30, todas de 2 horas: casi todas se cruzan entre sí.
    const statuses = await Promise.all(
      Array.from({ length: 12 }, (_value, index) => {
        const start = 8 * 60 + index * 30;
        return book(spaceId, toTime(start), toTime(start + 120));
      }),
    );

    expect(statuses.every((status) => status === 201 || status === 409)).toBe(true);
    const saved = await ReservationModel.find({ spaceId: new Types.ObjectId(spaceId), status: 'activa' }).lean();
    expect(saved.length).toBeGreaterThanOrEqual(1);
    expect(saved).toHaveLength(statuses.filter((status) => status === 201).length);
    for (let i = 0; i < saved.length; i += 1) {
      for (let j = i + 1; j < saved.length; j += 1) {
        expect(intervalsOverlap(saved[i]!, saved[j]!)).toBe(false);
      }
    }
  });
});
