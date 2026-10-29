import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { signToken } from '../../src/middleware/authenticate-jwt';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import type { UserRole } from '../../src/models/user.model';
import { zonedDateTimeToUtc } from '../../src/utils/datetime';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';

/** T019: contrato de GET /api/spaces/availability. */
function tokenFor(role: UserRole): string {
  return signToken({ id: String(new Types.ObjectId()), role });
}

describe('Contrato GET /api/spaces/availability: acceso y parámetros', () => {
  it('sin token responde 401 con la forma común', async () => {
    const response = await request(app).get('/api/spaces/availability?date=2026-11-10');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
  });

  it.each([
    ['sin fecha', ''],
    ['fecha vacía', '?date='],
    ['fecha con otro formato', '?date=10/11/2026'],
    ['fecha inexistente en el calendario', '?date=2026-02-30'],
    ['fecha repetida', '?date=2026-11-10&date=2026-11-11'],
  ])('%s responde 400 con la forma común', async (_caso, query) => {
    const response = await request(app)
      .get(`/api/spaces/availability${query}`)
      .set('Authorization', `Bearer ${tokenFor('solicitante')}`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });
});

describeWithDatabase('Contrato GET /api/spaces/availability: respuesta 200 (MongoDB real)', () => {
  let spaceId: string;

  beforeAll(async () => {
    await connectTestDatabase('availability-contract');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    const space = await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' });
    spaceId = String(space._id);
    await ReservationModel.create({
      userId: new Types.ObjectId(),
      spaceId: space._id,
      localDate: '2026-11-10',
      startAt: zonedDateTimeToUtc('2026-11-10', '08:00'),
      endAt: zonedDateTimeToUtc('2026-11-10', '10:00'),
    });
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  it.each(['solicitante', 'administrador'] as const)('el rol %s recibe 200 con la forma del contrato', async (role) => {
    const response = await request(app)
      .get('/api/spaces/availability?date=2026-11-10')
      .set('Authorization', `Bearer ${tokenFor(role)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      date: '2026-11-10',
      timezone: 'America/Guayaquil',
      spaces: [
        {
          id: spaceId,
          name: 'Sala Norte',
          type: 'sala',
          capacity: 20,
          location: 'Edificio A',
          occupiedSlots: [{ startAt: '2026-11-10T08:00:00-05:00', endAt: '2026-11-10T10:00:00-05:00' }],
        },
      ],
    });
  });
});
