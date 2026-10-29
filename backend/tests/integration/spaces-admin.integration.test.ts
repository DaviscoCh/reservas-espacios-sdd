import request from 'supertest';
import app from '../../src/app';
import { ReservationModel } from '../../src/models/reservation.model';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/** T046: restricciones por rol y desactivación efectiva contra una instancia real de MongoDB. */
const DATE = '2030-01-15';

describeWithDatabase('Administración de espacios (MongoDB real)', () => {
  const admin = tokenFor('administrador');
  const requester = tokenFor('solicitante');

  const createSpace = (name = 'Sala Norte') =>
    request(app).post('/api/spaces').set('Authorization', bearer(admin)).send({ name, type: 'sala', capacity: 20, location: 'Edificio A' });
  const editSpace = (token: string, id: string, body: object) =>
    request(app).patch(`/api/spaces/${id}`).set('Authorization', bearer(token)).send(body);
  const book = (spaceId: string, startTime: string, endTime: string) =>
    request(app).post('/api/reservations').set('Authorization', bearer(requester)).send({ spaceId, date: DATE, startTime, endTime });
  const availability = () => request(app).get(`/api/spaces/availability?date=${DATE}`).set('Authorization', bearer(requester));

  beforeAll(async () => {
    await connectTestDatabase('spaces-admin-integration');
    await Promise.all([SpaceModel.init(), ReservationModel.init()]);
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await Promise.all([SpaceModel.deleteMany({}), ReservationModel.deleteMany({})]);
  });

  it('el solicitante no puede dar de alta, editar ni desactivar espacios y no se guarda ningún cambio', async () => {
    const created = await createSpace();

    const create = await request(app).post('/api/spaces').set('Authorization', bearer(requester)).send({ name: 'Otra', type: 'sala', capacity: 5, location: 'B' });
    const edit = await editSpace(requester, created.body.id, { name: 'Hackeada' });
    const deactivate = await editSpace(requester, created.body.id, { isActive: false });

    expect([create.status, edit.status, deactivate.status]).toEqual([403, 403, 403]);
    expect(await SpaceModel.countDocuments()).toBe(1);
    const saved = await SpaceModel.findById(created.body.id);
    expect(saved?.name).toBe('Sala Norte');
    expect(saved?.isActive).toBe(true);
  });

  it('un cambio con un dato válido y otro inválido se rechaza completo, sin cambios parciales', async () => {
    const created = await createSpace();
    const response = await editSpace(admin, created.body.id, { name: 'Sala Nueva', capacity: -1 });

    expect(response.status).toBe(400);
    expect((await SpaceModel.findById(created.body.id))?.name).toBe('Sala Norte');
  });

  it('un espacio nuevo aparece activo en la disponibilidad y se puede reservar', async () => {
    const created = await createSpace();
    expect(created.body.isActive).toBe(true);

    const slots = await availability();
    expect(slots.body.spaces.map((space: { name: string }) => space.name)).toEqual(['Sala Norte']);
    expect((await book(created.body.id, '08:00', '10:00')).status).toBe(201);
  });

  it('al desactivar un espacio deja de ofrecerse, no admite reservas nuevas y conserva las existentes', async () => {
    const created = await createSpace();
    const existing = await book(created.body.id, '08:00', '10:00');
    expect(existing.status).toBe(201);

    expect((await editSpace(admin, created.body.id, { isActive: false })).status).toBe(200);

    expect((await availability()).body.spaces).toEqual([]);
    const rejected = await book(created.body.id, '14:00', '15:00');
    expect(rejected.status).toBe(409);
    expect(rejected.body.message).toMatch(/desactivado/i);

    const mine = await request(app).get('/api/reservations/me').set('Authorization', bearer(requester));
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ id: existing.body.id, status: 'activa' });
    expect(await SpaceModel.countDocuments()).toBe(1);
  });

  it('un espacio desactivado no se puede reactivar en esta versión (409) y sigue desactivado', async () => {
    const created = await createSpace();
    await editSpace(admin, created.body.id, { isActive: false });

    const response = await editSpace(admin, created.body.id, { isActive: true });
    expect(response.status).toBe(409);
    expect((await SpaceModel.findById(created.body.id))?.isActive).toBe(false);
  });

  it('un espacio desactivado se puede seguir editando (por ejemplo su ubicación)', async () => {
    const created = await createSpace();
    await editSpace(admin, created.body.id, { isActive: false });

    const response = await editSpace(admin, created.body.id, { location: 'Edificio C' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ location: 'Edificio C', isActive: false });
  });

  it('flujo completo: alta, reserva, edición de datos y desactivación', async () => {
    const created = await createSpace('Cancha 1');
    await book(created.body.id, '09:00', '10:00');
    await editSpace(admin, created.body.id, { capacity: 30 });

    const afterEdit = await availability();
    expect(afterEdit.body.spaces[0]).toMatchObject({ name: 'Cancha 1', capacity: 30 });
    expect(afterEdit.body.spaces[0].occupiedSlots).toHaveLength(1);

    await editSpace(admin, created.body.id, { isActive: false });
    expect((await availability()).body.spaces).toEqual([]);
  });
});
