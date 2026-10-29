import express from 'express';
import request from 'supertest';
import app from '../../src/app';
import { authenticateJwt } from '../../src/middleware/authenticate-jwt';
import { authorizeRole } from '../../src/middleware/authorize-role';
import { errorHandler } from '../../src/middleware/error-handler';
import { UserModel, type UserRole } from '../../src/models/user.model';
import { hashPassword } from '../../src/services/auth/auth.service';
import { closeTestDatabase, connectTestDatabase, describeWithDatabase } from '../helpers/database';

/**
 * T039: autorización por rol con tokens emitidos por el login real. Como las rutas de espacios y
 * reservas se implementan en US1-US3, la prueba usa rutas de muestra con los mismos middlewares
 * (authenticateJwt y authorizeRole) que esas rutas reutilizan.
 */
const PASSWORD = 'Secreto123';

const protectedApp = express();
protectedApp.get('/autenticados', authenticateJwt, (_req, res) => {
  res.json({ ok: true });
});
protectedApp.get('/solo-administrador', authenticateJwt, authorizeRole('administrador'), (_req, res) => {
  res.json({ ok: true });
});
protectedApp.get('/solo-solicitante', authenticateJwt, authorizeRole('solicitante'), (_req, res) => {
  res.json({ ok: true });
});
protectedApp.use(errorHandler);

async function loginAs(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return response.body.token as string;
}

describeWithDatabase('Autorización por rol (MongoDB real)', () => {
  const tokens = {} as Record<UserRole, string>;

  beforeAll(async () => {
    await connectTestDatabase('auth-roles');
    await UserModel.init();
    const passwordHash = await hashPassword(PASSWORD);
    await UserModel.create([
      { email: 'solicitante@organizacion.test', passwordHash, role: 'solicitante' },
      { email: 'admin@organizacion.test', passwordHash, role: 'administrador' },
    ]);
    tokens.solicitante = await loginAs('solicitante@organizacion.test');
    tokens.administrador = await loginAs('admin@organizacion.test');
  }, 30000);

  afterAll(async () => {
    await closeTestDatabase();
  }, 30000);

  it('sin token todas las rutas protegidas responden 401', async () => {
    for (const path of ['/autenticados', '/solo-administrador', '/solo-solicitante']) {
      const response = await request(protectedApp).get(path);
      expect(response.status).toBe(401);
    }
  });

  it('un token inválido responde 401', async () => {
    const response = await request(protectedApp).get('/autenticados').set('Authorization', 'Bearer invalido');
    expect(response.status).toBe(401);
  });

  it('el solicitante accede a su ruta y recibe 403 en la del administrador', async () => {
    const own = await request(protectedApp).get('/solo-solicitante').set('Authorization', `Bearer ${tokens.solicitante}`);
    const admin = await request(protectedApp)
      .get('/solo-administrador')
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(own.status).toBe(200);
    expect(admin.status).toBe(403);
    expect(admin.body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
  });

  it('el administrador accede a su ruta y recibe 403 en la del solicitante', async () => {
    const own = await request(protectedApp)
      .get('/solo-administrador')
      .set('Authorization', `Bearer ${tokens.administrador}`);
    const requester = await request(protectedApp)
      .get('/solo-solicitante')
      .set('Authorization', `Bearer ${tokens.administrador}`);

    expect(own.status).toBe(200);
    expect(requester.status).toBe(403);
  });

  it('ambos roles acceden a una ruta que solo exige autenticación', async () => {
    for (const role of ['solicitante', 'administrador'] as const) {
      const response = await request(protectedApp).get('/autenticados').set('Authorization', `Bearer ${tokens[role]}`);
      expect(response.status).toBe(200);
    }
  });
});
