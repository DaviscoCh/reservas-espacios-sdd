import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/** T027: contrato de GET /api/reservations/me y PATCH /api/reservations/:id/cancel. */
describe('Contrato de reservas propias: acceso', () => {
  const cancelPath = `/api/reservations/${new Types.ObjectId()}/cancel`;

  it('GET /me sin token responde 401', async () => {
    expect((await request(app).get('/api/reservations/me')).status).toBe(401);
  });

  it('PATCH /:id/cancel sin token responde 401', async () => {
    expect((await request(app).patch(cancelPath)).status).toBe(401);
  });

  it('GET /me con rol administrador responde 403', async () => {
    const response = await request(app).get('/api/reservations/me').set('Authorization', bearer(tokenFor('administrador')));
    expect(response.status).toBe(403);
  });

  it('PATCH /:id/cancel con rol administrador responde 403', async () => {
    const response = await request(app).patch(cancelPath).set('Authorization', bearer(tokenFor('administrador')));
    expect(response.status).toBe(403);
  });
});

describeWithDatabase('Contrato de reservas propias (MongoDB real)', () => {
  const ana = String(new Types.ObjectId());
  const beto = String(new Types.ObjectId());
  const anaToken = tokenFor('solicitante', ana);
  const betoToken = tokenFor('solicitante', beto);
  let spaceId: string;

  async function reserve(userId: string, date: string, from: string, to: string, status: 'activa' | 'cancelada' = 'activa') {
    const startAt = new Date(`${date}T${from}:00.000-05:00`);
    const endAt = new Date(`${date}T${to}:00.000-05:00`);
    return ReservationModel.create({ userId: new Types.ObjectId(userId), spaceId, localDate: date, startAt, endAt, status });
  }

  beforeAll(async () => {
    await connectTestDatabase('reservations-own');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
    spaceId = String((await SpaceModel.create({ name: 'Sala Norte', type: 'sala', capacity: 20, location: 'Edificio A' }))._id);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await ReservationModel.deleteMany({});
  });

  describe('GET /api/reservations/me', () => {
    it('devuelve solo las reservas propias, incluidas las canceladas, por inicio descendente', async () => {
      await reserve(ana, '2030-01-15', '08:00', '09:00');
      await reserve(ana, '2030-01-17', '10:00', '11:00', 'cancelada');
      await reserve(ana, '2030-01-16', '14:00', '15:00');
      await reserve(beto, '2030-01-16', '09:00', '10:00');

      const response = await request(app).get('/api/reservations/me').set('Authorization', bearer(anaToken));

      expect(response.status).toBe(200);
      expect(response.body.map((r: { date: string; status: string }) => [r.date, r.status])).toEqual([
        ['2030-01-17', 'cancelada'],
        ['2030-01-16', 'activa'],
        ['2030-01-15', 'activa'],
      ]);
      expect(response.body[0]).toEqual({
        id: expect.any(String),
        spaceId,
        spaceName: 'Sala Norte',
        date: '2030-01-17',
        startAt: '2030-01-17T10:00:00-05:00',
        endAt: '2030-01-17T11:00:00-05:00',
        status: 'cancelada',
      });
    });

    it('sin reservas devuelve una lista vacía', async () => {
      const response = await request(app).get('/api/reservations/me').set('Authorization', bearer(betoToken));
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('PATCH /api/reservations/:id/cancel', () => {
    it('200: cancela una reserva propia y activa', async () => {
      const reservation = await reserve(ana, '2030-01-15', '08:00', '09:00');
      const response = await request(app)
        .patch(`/api/reservations/${reservation._id}/cancel`)
        .set('Authorization', bearer(anaToken));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: String(reservation._id), status: 'cancelada' });
      expect((await ReservationModel.findById(reservation._id))?.status).toBe('cancelada');
    });

    it('404: la reserva de otro usuario no se puede cancelar y sigue activa', async () => {
      const reservation = await reserve(ana, '2030-01-15', '08:00', '09:00');
      const response = await request(app)
        .patch(`/api/reservations/${reservation._id}/cancel`)
        .set('Authorization', bearer(betoToken));

      expect(response.status).toBe(404);
      expect((await ReservationModel.findById(reservation._id))?.status).toBe('activa');
    });

    it.each([
      ['un identificador que no existe', String(new Types.ObjectId())],
      ['un identificador mal formado', 'no-es-un-id'],
    ])('404 con %s', async (_caso, id) => {
      const response = await request(app).patch(`/api/reservations/${id}/cancel`).set('Authorization', bearer(anaToken));
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
    });

    it('409: una reserva ya cancelada no se puede cancelar de nuevo', async () => {
      const reservation = await reserve(ana, '2030-01-15', '08:00', '09:00', 'cancelada');
      const response = await request(app)
        .patch(`/api/reservations/${reservation._id}/cancel`)
        .set('Authorization', bearer(anaToken));

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CONFLICT');
    });
  });
});
