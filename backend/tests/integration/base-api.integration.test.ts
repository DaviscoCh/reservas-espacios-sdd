import request from 'supertest';
import app from '../../src/app';

describe('API base (/api)', () => {
  it('GET /api/health responde 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('una ruta inexistente responde 404 con la forma común { code, message }', async () => {
    const response = await request(app).get('/api/no-existe');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
  });

  it('un JSON mal formado responde 400 con la forma común', async () => {
    const response = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('los módulos auth, spaces y reservations están registrados bajo /api y protegidos', async () => {
    // Cada módulo responde 401 propio (falta el token), no 404 ni un error 500.
    for (const path of ['/api/auth/me', '/api/spaces/availability?date=2026-11-10', '/api/reservations/me']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    }
  });
});
