import { Types } from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { SpaceModel } from '../../src/models/space.model';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';
import { bearer, tokenFor } from '../helpers/tokens';

/** T045: contrato de GET/POST /api/spaces y PATCH /api/spaces/:id. */
const admin = tokenFor('administrador');
const requester = tokenFor('solicitante');
const validSpace = { name: 'Cancha 1', type: 'cancha', capacity: 12, location: 'Complejo deportivo' };

const post = (token: string, body: unknown) => request(app).post('/api/spaces').set('Authorization', bearer(token)).send(body as object);
const patch = (token: string, id: string, body: unknown) =>
  request(app).patch(`/api/spaces/${id}`).set('Authorization', bearer(token)).send(body as object);

describe('Contrato de administración de espacios: acceso y validación', () => {
  it('POST sin token responde 401 y con rol solicitante 403', async () => {
    expect((await request(app).post('/api/spaces').send(validSpace)).status).toBe(401);
    const forbidden = await post(requester, validSpace);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
  });

  it('PATCH sin token responde 401 y con rol solicitante 403', async () => {
    const id = String(new Types.ObjectId());
    expect((await request(app).patch(`/api/spaces/${id}`).send({ name: 'X' })).status).toBe(401);
    expect((await patch(requester, id, { name: 'X' })).status).toBe(403);
  });

  it('GET / sin token responde 401', async () => {
    expect((await request(app).get('/api/spaces')).status).toBe(401);
  });

  it('GET / con un filtro active inválido responde 400', async () => {
    const response = await request(app).get('/api/spaces?active=quizas').set('Authorization', bearer(admin));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['sin nombre', { ...validSpace, name: undefined }],
    ['con un tipo inválido', { ...validSpace, type: 'auditorio' }],
    ['con capacidad cero', { ...validSpace, capacity: 0 }],
    ['con capacidad decimal', { ...validSpace, capacity: 2.5 }],
    ['sin ubicación', { ...validSpace, location: '  ' }],
  ])('POST %s responde 400 con la forma común', async (_caso, body) => {
    const response = await post(admin, body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it.each([
    ['vacío', {}],
    ['con capacidad inválida', { capacity: -3 }],
    ['con un estado que no es booleano', { isActive: 'no' }],
  ])('PATCH %s responde 400 con la forma común', async (_caso, body) => {
    const response = await patch(admin, String(new Types.ObjectId()), body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it('PATCH con un identificador mal formado responde 404', async () => {
    const response = await patch(admin, 'no-es-un-id', { name: 'Nuevo' });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
});

describeWithDatabase('Contrato de administración de espacios (MongoDB real)', () => {
  beforeAll(async () => {
    await connectTestDatabase('spaces-admin-contract');
    await SpaceModel.init();
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await SpaceModel.deleteMany({});
  });

  it('POST responde 201 con el espacio creado y activo', async () => {
    const response = await post(admin, validSpace);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: expect.any(String), ...validSpace, isActive: true });
    expect(await SpaceModel.countDocuments()).toBe(1);
  });

  it('PATCH responde 200 con los datos editados y conserva los demás', async () => {
    const created = await post(admin, validSpace);
    const response = await patch(admin, created.body.id, { name: 'Cancha Principal', capacity: 22 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: created.body.id,
      name: 'Cancha Principal',
      type: 'cancha',
      capacity: 22,
      location: 'Complejo deportivo',
      isActive: true,
    });
  });

  it('PATCH con isActive false desactiva el espacio sin eliminarlo', async () => {
    const created = await post(admin, validSpace);
    const response = await patch(admin, created.body.id, { isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.isActive).toBe(false);
    expect(await SpaceModel.countDocuments()).toBe(1);
  });

  it('PATCH responde 404 si el espacio no existe', async () => {
    const response = await patch(admin, String(new Types.ObjectId()), { name: 'Nuevo' });
    expect(response.status).toBe(404);
  });

  it('GET / lista los espacios por nombre para cualquier rol autenticado y admite active', async () => {
    await post(admin, { ...validSpace, name: 'Sala Sur', type: 'sala' });
    const inactive = await post(admin, validSpace);
    await patch(admin, inactive.body.id, { isActive: false });

    const all = await request(app).get('/api/spaces').set('Authorization', bearer(requester));
    const active = await request(app).get('/api/spaces?active=true').set('Authorization', bearer(admin));
    const inactiveOnly = await request(app).get('/api/spaces?active=false').set('Authorization', bearer(admin));

    expect(all.status).toBe(200);
    expect(all.body.map((space: { name: string }) => space.name)).toEqual(['Cancha 1', 'Sala Sur']);
    expect(active.body.map((space: { name: string }) => space.name)).toEqual(['Sala Sur']);
    expect(inactiveOnly.body.map((space: { name: string }) => space.name)).toEqual(['Cancha 1']);
  });
});
