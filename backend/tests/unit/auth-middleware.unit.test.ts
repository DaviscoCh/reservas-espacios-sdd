import express from 'express';
import request from 'supertest';
import { authenticateJwt, getAuthUser, signToken } from '../../src/middleware/authenticate-jwt';
import { authorizeRole } from '../../src/middleware/authorize-role';
import { errorHandler } from '../../src/middleware/error-handler';

function buildApp(): express.Express {
  const app = express();
  app.get('/privada', authenticateJwt, (_req, res) => {
    res.json({ user: getAuthUser(res) });
  });
  app.get('/solo-admin', authenticateJwt, authorizeRole('administrador'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('autenticación JWT y autorización por rol', () => {
  const app = buildApp();
  const solicitante = signToken({ id: 'u1', role: 'solicitante' });
  const administrador = signToken({ id: 'u2', role: 'administrador' });

  it('responde 401 sin token', async () => {
    const response = await request(app).get('/privada');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
  });

  it('responde 401 con un token inválido', async () => {
    const response = await request(app).get('/privada').set('Authorization', 'Bearer token-falso');
    expect(response.status).toBe(401);
  });

  it('deja pasar un token válido y expone la identidad mínima', async () => {
    const response = await request(app).get('/privada').set('Authorization', `Bearer ${solicitante}`);
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 'u1', role: 'solicitante' });
  });

  it('responde 403 si el rol es insuficiente', async () => {
    const response = await request(app).get('/solo-admin').set('Authorization', `Bearer ${solicitante}`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('permite el acceso al rol autorizado', async () => {
    const response = await request(app).get('/solo-admin').set('Authorization', `Bearer ${administrador}`);
    expect(response.status).toBe(200);
  });
});
