import request from 'supertest';
import app from '../../src/app';

/** T040A: un payload inválido en el login responde 400 { code, message } sin consultar la base de datos. */
describe('Contrato POST /api/auth/login: validación del payload', () => {
  const invalidBodies: Array<[string, unknown]> = [
    ['sin correo', { password: 'Secreto123' }],
    ['correo vacío', { email: '   ', password: 'Secreto123' }],
    ['correo con formato inválido', { email: 'no-es-un-correo', password: 'Secreto123' }],
    ['correo que no es texto', { email: 123, password: 'Secreto123' }],
    ['sin contraseña', { email: 'ana@organizacion.test' }],
    ['contraseña vacía', { email: 'ana@organizacion.test', password: '' }],
    ['contraseña que no es texto', { email: 'ana@organizacion.test', password: 12345 }],
    ['contraseña demasiado larga', { email: 'ana@organizacion.test', password: 'x'.repeat(201) }],
    ['objeto vacío', {}],
    ['cuerpo que no es un objeto', ['ana@organizacion.test', 'Secreto123']],
  ];

  it.each(invalidBodies)('%s responde 400 con la forma común', async (_caso, body) => {
    const response = await request(app).post('/api/auth/login').send(body as object);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it('una solicitud sin cuerpo responde 400 con la forma común', async () => {
    const response = await request(app).post('/api/auth/login');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });
});
